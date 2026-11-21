import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import * as ledger from './ledger.service.js';

// ---------------------------------------------------------------------------
// Lecture du journal financier + corrections administrées.
// Portées par rôle (deny by default, spec §12.2) :
// - STUDENT : son propre portefeuille uniquement ;
// - PARENT  : portefeuille d'un enfant lié APPROVED (§3.2), studentId requis ;
// - ADMIN   : tout le journal, filtre studentId optionnel.
// Le déni d'accès à un objet précis renvoie NOT_FOUND (anti-IDOR, §12.3).
// ---------------------------------------------------------------------------

const publicTransaction = (t) => ({
  id: t.id,
  reference: t.reference,
  type: t.type,
  status: t.status,
  amount: t.amount,
  currency: t.currency,
  studentId: t.wallet?.studentId ?? null,
  walletBalanceAfter: t.walletBalanceAfter,
  canteenBalanceAfter: t.canteenBalanceAfter,
  reservationId: t.reservationId,
  paymentIntentId: t.paymentIntentId,
  withdrawalId: t.withdrawalId,
  reversesId: t.reversesId,
  createdAt: t.createdAt,
});

const walletIdForStudent = async (studentId) => {
  const wallet = await prisma.wallet.findUnique({
    where: { studentId },
    select: { id: true },
  });
  return wallet?.id ?? null;
};

// Vérifie le lien parent → enfant (spec §3.2 : "associés et autorisés").
const assertParentLink = async (parentId, studentId) => {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { status: true },
  });
  if (link?.status !== 'APPROVED') {
    throw new ApiError(404, 'NOT_FOUND', 'Élève introuvable');
  }
};

// Résout la portée de lecture : { all: true } ou { walletId }.
const resolveScope = async (user, studentId) => {
  switch (user.role) {
    case 'ADMIN':
      if (!studentId) return { all: true };
      return { walletId: await walletIdForStudent(studentId) };
    case 'STUDENT': {
      const ownId = user.studentProfile?.id;
      if (studentId && studentId !== ownId) {
        throw new ApiError(404, 'NOT_FOUND', 'Élève introuvable');
      }
      if (!ownId) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');
      return { walletId: await walletIdForStudent(ownId) };
    }
    case 'PARENT':
      if (!studentId) {
        throw new ApiError(400, 'STUDENT_REQUIRED', 'Paramètre studentId requis');
      }
      await assertParentLink(user.id, studentId);
      return { walletId: await walletIdForStudent(studentId) };
    default:
      throw new ApiError(403, 'FORBIDDEN', 'Accès refusé');
  }
};

export const list = async (user, { page, pageSize, type, status, studentId, from, to }) => {
  const scope = await resolveScope(user, studentId);
  const where = {
    ...(scope.all ? {} : { walletId: scope.walletId ?? '__none__' }),
    ...(type && { type }),
    ...(status && { status }),
    ...((from || to) && {
      createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
    }),
  };
  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { wallet: { select: { studentId: true } } },
    }),
  ]);
  return {
    transactions: transactions.map(publicTransaction),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getById = async (user, id) => {
  const t = await prisma.transaction.findUnique({
    where: { id },
    include: { wallet: { select: { studentId: true } } },
  });
  if (!t) throw new ApiError(404, 'NOT_FOUND', 'Écriture introuvable');

  const studentId = t.wallet?.studentId;
  if (user.role === 'ADMIN') return { transaction: publicTransaction(t) };
  if (user.role === 'STUDENT' && studentId && studentId === user.studentProfile?.id) {
    return { transaction: publicTransaction(t) };
  }
  if (user.role === 'PARENT' && studentId) {
    await assertParentLink(user.id, studentId); // 404 si non lié
    return { transaction: publicTransaction(t) };
  }
  // Objet existant mais hors portée : NOT_FOUND, pas 403 (anti-IDOR).
  throw new ApiError(404, 'NOT_FOUND', 'Écriture introuvable');
};

// ADJUSTMENT documenté sur un portefeuille élève (spec §8.5) — ADMIN.
// Utile aussi pour la démo tant que l'agrégateur Jeko n'est pas branché.
export const createAdjustment = async (admin, { studentId, amount, direction, reason }) => {
  const wallet = await prisma.wallet.findUnique({
    where: { studentId },
    select: { id: true },
  });
  if (!wallet) throw new ApiError(404, 'NOT_FOUND', 'Portefeuille introuvable');

  const delta = direction === 'CREDIT' ? amount : -amount;
  const transaction = await ledger.withLedgerTransaction(async (tx) => {
    const { transaction: entry } = await ledger.postEntry(tx, {
      type: 'ADJUSTMENT',
      amount,
      walletId: wallet.id,
      walletDelta: delta,
      initiatorId: admin.id,
      metadata: { reason },
    });
    // Action financière sensible tracée (spec §12.4), dans la même transaction.
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'WALLET_ADJUSTMENT',
        resourceType: 'Wallet',
        resourceId: wallet.id,
        result: 'SUCCESS',
        metadata: { transactionId: entry.id, delta, reason },
      },
    });
    return entry;
  });
  return { transaction: publicTransaction({ ...transaction, wallet: { studentId } }) };
};

// Compense une écriture par son inverse (spec §8.5) — ADMIN.
export const createReversal = async (admin, { id, reason }) => {
  const transaction = await ledger.withLedgerTransaction(async (tx) => {
    const reversal = await ledger.reverseTransaction(tx, id, {
      initiatorId: admin.id,
      reason,
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'TRANSACTION_REVERSAL',
        resourceType: 'Transaction',
        resourceId: id,
        result: 'SUCCESS',
        metadata: { reversalId: reversal.id, reason },
      },
    });
    return tx.transaction.findUniqueOrThrow({
      where: { id: reversal.id },
      include: { wallet: { select: { studentId: true } } },
    });
  });
  return { transaction: publicTransaction(transaction) };
};
