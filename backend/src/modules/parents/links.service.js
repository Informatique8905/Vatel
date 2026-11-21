import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { randomToken, hashToken } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import { businessRules } from '../../config/businessRules.js';
import * as notify from '../notifications/notifications.service.js';
import * as events from '../notifications/events.js';

// ---------------------------------------------------------------------------
// Liaisons parent-enfant (spec liaison) — un seul mécanisme, deux transports :
// le MÊME jeton opaque sert de contenu au QR code et de lien d'invitation.
//
// Sécurité :
// - jamais d'identifiant interne dans le jeton (randomToken + hash stocké) ;
// - usage unique, expiration configurable, révocation par le créateur ;
// - claim uniquement par un compte authentifié du rôle COMPLÉMENTAIRE ;
// - décision produit : APPROVED immédiat au claim ; les deux parties sont
//   notifiées et peuvent révoquer (= correction d'une liaison incorrecte).
// - révocation = statut REVOKED + auteur tracé ; l'historique est conservé.
// ---------------------------------------------------------------------------

const TARGET_ROLE = { PARENT: 'STUDENT', STUDENT: 'PARENT' };

const publicInvitation = (i, { withToken = false, token } = {}) => ({
  id: i.id,
  targetRole: i.targetRole,
  ...(withToken && { token }),
  used: Boolean(i.usedAt),
  revoked: Boolean(i.revokedAt),
  expiresAt: i.expiresAt,
  createdAt: i.createdAt,
});

const name = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

const publicLink = (l) => ({
  id: l.id,
  status: l.status,
  method: l.method,
  approvedAt: l.approvedAt,
  revokedAt: l.revokedAt,
  createdAt: l.createdAt,
  parent: { id: l.parent.id, name: name(l.parent) },
  student: {
    id: l.student.id,
    name: name(l.student.user),
    kind: l.student.kind,
    grade: l.student.grade,
  },
});

// --- Invitations (créateur : STUDENT ou PARENT) ---

export const createInvitation = async (user) => {
  const targetRole = TARGET_ROLE[user.role];
  if (!targetRole) throw new ApiError(403, 'FORBIDDEN', 'Rôle non autorisé à créer une invitation');
  if (user.role === 'STUDENT' && !user.studentProfile) {
    throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');
  }
  const token = randomToken(32);
  const invitation = await prisma.linkInvitation.create({
    data: {
      creatorId: user.id,
      targetRole,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.linkInvitationTtlHours * 3600_000),
    },
  });
  // Le jeton n'est retourné qu'une fois — seul le hash est conservé en base.
  return { invitation: publicInvitation(invitation, { withToken: true, token }) };
};

export const listInvitations = async (user) => {
  const invitations = await prisma.linkInvitation.findMany({
    where: { creatorId: user.id, revokedAt: null, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return { invitations: invitations.map((i) => publicInvitation(i)) };
};

export const revokeInvitation = async (user, id) => {
  const { count } = await prisma.linkInvitation.updateMany({
    where: { id, creatorId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new ApiError(404, 'NOT_FOUND', 'Invitation introuvable');
};

// --- Claim : claimer authentifié, rôle complémentaire, jeton valide ---
export const claim = async (user, { token, method }) => {
  const invitation = await prisma.linkInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { creator: { include: { studentProfile: true } } },
  });
  const usable = invitation && !invitation.usedAt && !invitation.revokedAt && invitation.expiresAt > new Date();
  if (!usable) throw new ApiError(400, 'INVALID_INVITATION', 'Invitation invalide, expirée ou déjà utilisée');
  if (invitation.creatorId === user.id) {
    throw new ApiError(400, 'SELF_LINK', 'Impossible de se lier à son propre compte');
  }
  // Rôles complémentaires exigés : un PARENT claim une invitation STUDENT, etc.
  if (user.role !== invitation.targetRole) {
    throw new ApiError(403, 'ROLE_MISMATCH', 'Cette invitation ne correspond pas à votre type de compte');
  }

  const parentUser = invitation.targetRole === 'STUDENT' ? invitation.creator : user;
  const studentUser = invitation.targetRole === 'STUDENT' ? user : invitation.creator;
  const studentProfile = studentUser.studentProfile
    ?? await prisma.studentProfile.findUnique({ where: { userId: studentUser.id } });
  if (!studentProfile) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');

  const { link, notifs } = await prisma.$transaction(async (tx) => {
    // Consommation atomique de l'invitation : un seul claim accepté.
    const { count } = await tx.linkInvitation.updateMany({
      where: { id: invitation.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date(), usedById: user.id },
    });
    if (count === 0) throw new ApiError(400, 'INVALID_INVITATION', 'Invitation invalide ou déjà utilisée');

    const existing = await tx.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parentUser.id, studentId: studentProfile.id } },
    });
    if (existing?.status === 'APPROVED') {
      throw new ApiError(409, 'ALREADY_LINKED', 'Ces deux comptes sont déjà associés');
    }
    // Réactivation d'une liaison révoquée ou création : APPROVED immédiat.
    const linked = existing
      ? await tx.parentStudent.update({
          where: { id: existing.id },
          data: {
            status: 'APPROVED', method, initiatedById: user.id,
            approvedAt: new Date(), revokedAt: null, revokedById: null,
          },
        })
      : await tx.parentStudent.create({
          data: {
            parentId: parentUser.id, studentId: studentProfile.id,
            status: 'APPROVED', method, initiatedById: user.id, approvedAt: new Date(),
          },
        });

    // Traçabilité financière sensible (§12.4) + notification aux deux parties
    // (permet de signaler/corriger une liaison incorrecte par révocation).
    await tx.auditLog.create({
      data: {
        actorId: user.id, action: 'PARENT_LINK_CREATED', resourceType: 'ParentStudent',
        resourceId: linked.id, result: 'SUCCESS',
        metadata: { method, invitationId: invitation.id, parentId: parentUser.id, studentId: studentProfile.id },
      },
    });
    const notifs = await notify.notifyInTx(tx, events.linkCreated(parentUser.id, studentUser.id, {
      parentName: name(parentUser), studentName: name(studentUser),
    }));
    return { link: linked, notifs };
  });

  // Push post-commit : jamais dans la transaction métier (§13).
  notify.deliver(notifs);
  return { link: await fullLink(link.id) };
};

const linkInclude = {
  parent: { select: { id: true, firstName: true, lastName: true, email: true } },
  student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
};

const fullLink = (id) =>
  prisma.parentStudent.findUniqueOrThrow({ where: { id }, include: linkInclude }).then(publicLink);

// --- Consultation : chacun ne voit que SES liaisons ---
export const listMyLinks = async (user) => {
  const where =
    user.role === 'PARENT' ? { parentId: user.id }
    : user.role === 'STUDENT' ? { student: { userId: user.id } }
    : {}; // ADMIN : tout (audit)
  const links = await prisma.parentStudent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: linkInclude,
  });
  return { links: links.map(publicLink) };
};

// Enfants liés APPROVED avec solde — la vue « recharger » du parent (§3.2).
export const listChildren = async (parent) => {
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parent.id, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          wallet: { select: { balance: true, currency: true } },
        },
      },
    },
  });
  return {
    children: links.map((l) => ({
      balance: l.student.wallet?.balance ?? 0,
      linkId: l.id,
      studentId: l.student.id,
      name: name(l.student.user),
      kind: l.student.kind,
      grade: l.student.grade,
      lowBalance: (l.student.wallet?.balance ?? 0) < businessRules.lowBalanceThresholdXof,
      currency: l.student.wallet?.currency ?? 'XOF',
      linkedAt: l.approvedAt ?? l.createdAt,
    })),
  };
};

// --- Révocation : une des deux parties ou ADMIN, tracée ---
export const revokeLink = async (user, linkId) => {
  const link = await prisma.parentStudent.findUnique({
    where: { id: linkId },
    include: linkInclude,
  });
  if (!link || link.status === 'REVOKED') {
    throw new ApiError(404, 'NOT_FOUND', 'Liaison introuvable');
  }
  const isParty =
    link.parentId === user.id || link.student.userId === user.id;
  if (!isParty && user.role !== 'ADMIN') {
    throw new ApiError(404, 'NOT_FOUND', 'Liaison introuvable'); // anti-IDOR
  }

  const notifs = await prisma.$transaction(async (tx) => {
    const { count } = await tx.parentStudent.updateMany({
      where: { id: link.id, status: { not: 'REVOKED' } },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedById: user.id },
    });
    if (count === 0) throw new ApiError(404, 'NOT_FOUND', 'Liaison introuvable');
    await tx.auditLog.create({
      data: {
        actorId: user.id, action: 'PARENT_LINK_REVOKED', resourceType: 'ParentStudent',
        resourceId: link.id, result: 'SUCCESS',
        metadata: { parentId: link.parentId, studentId: link.studentId, previousStatus: link.status },
      },
    });
    // L'autre partie est informée — la coupure d'accès est immédiate
    // (tous les modules filtrent status=APPROVED).
    const otherUserId = link.parentId === user.id ? link.student.userId : link.parentId;
    const otherName = link.parentId === user.id ? name(link.parent) : name(link.student.user);
    return notify.notifyInTx(tx, events.linkRevoked(otherUserId, otherName));
  });
  notify.deliver(notifs);
};
