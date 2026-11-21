import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { makeReference } from '../../utils/crypto.js';
import { env } from '../../config/env.js';
import * as ledger from '../transactions/ledger.service.js';
import * as jeko from '../integrations/jeko/jeko.client.js';
import * as notify from '../notifications/notifications.service.js';
import * as events from '../notifications/events.js';

// ---------------------------------------------------------------------------
// Recharges parent -> portefeuille élève (spec §8.2).
// Cycle : CREATED -> PENDING (Jeko accepte la demande) -> SUCCEEDED | FAILED | EXPIRED.
// JAMAIS de crédit sur retour frontend : seul un statut 'success' confirmé
// (webhook signé + re-vérification GET /payment_requests/{id}) crédite le wallet.
// ---------------------------------------------------------------------------

const publicIntent = (p) => ({
  id: p.id,
  reference: p.reference,
  studentId: p.studentId,
  amount: p.amount,
  currency: p.currency,
  operator: p.operator,
  status: p.status,
  provider: p.provider,
  providerRef: p.providerRef,
  redirectUrl: p.redirectUrl,
  failureReason: p.failureReason,
  expiresAt: p.expiresAt,
  credited: Boolean(p.transaction),
  createdAt: p.createdAt,
});

const assertParentLink = async (parentId, studentId) => {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link || link.status !== 'APPROVED') {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Élève introuvable'); // anti-IDOR (§12.3)
  }
};

const walletOfStudent = async (studentId) => {
  const wallet = await prisma.wallet.findUnique({ where: { studentId } });
  if (!wallet) throw new ApiError(404, 'WALLET_NOT_FOUND', 'Portefeuille introuvable');
  return wallet;
};

// Crée la demande de recharge puis l'enregistre auprès de Jeko (checkout hébergé).
// Idempotent : même idempotencyKey -> le PaymentIntent existant est renvoyé.
export const createTopup = async (parent, { studentId, amount, operator, idempotencyKey }) => {
  if (idempotencyKey) {
    const existing = await prisma.paymentIntent.findUnique({ where: { idempotencyKey } });
    if (existing) return { intent: publicIntent(existing), replayed: true };
  }

  await assertParentLink(parent.id, studentId);
  await walletOfStudent(studentId);

  const reference = makeReference('TOP');
  let intent;
  try {
    intent = await prisma.paymentIntent.create({
      data: {
        reference,
        parentId: parent.id,
        studentId,
        amount,
        operator,
        idempotencyKey,
        expiresAt: new Date(Date.now() + env.topupExpiresMinutes * 60_000),
      },
    });
  } catch (err) {
    // Course sur la clé d'idempotence : le gagnant a déjà créé l'intent.
    if (err?.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.paymentIntent.findUnique({ where: { idempotencyKey } });
      if (existing) return { intent: publicIntent(existing), replayed: true };
    }
    throw err;
  }

  try {
    const created = await jeko.createPaymentRequest({
      reference,
      amountXof: amount,
      paymentMethod: jeko.JEKO_PAY_METHOD[operator],
      successUrl: `${env.paymentSuccessUrl}?ref=${reference}`,
      errorUrl: `${env.paymentErrorUrl}?ref=${reference}`,
    });
    intent = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        providerRef: created.id,
        redirectUrl: created.redirectUrl,
        status: 'PENDING',
      },
    });
  } catch (err) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'FAILED', failureReason: err.code ?? 'JEKO_ERROR' },
    });
    throw err;
  }
  return { intent: publicIntent(intent), replayed: false };
};

const intentOr404 = async (id) => {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id },
    include: { transaction: true },
  });
  if (!intent) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Recharge introuvable');
  return intent;
};

const assertCanView = async (user, intent) => {
  if (user.role === 'ADMIN') return;
  if (user.role === 'PARENT' && intent.parentId === user.id) return;
  if (user.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile && intent.studentId === profile.id) return;
  }
  throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Recharge introuvable');
};

export const getTopup = async (user, id) => {
  const intent = await intentOr404(id);
  await assertCanView(user, intent);
  return publicIntent(intent);
};

export const listTopups = async (user, { page, pageSize, studentId }) => {
  const where = {};
  if (user.role === 'PARENT') where.parentId = user.id;
  if (user.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    where.studentId = profile?.id ?? '__none__';
  }
  if (studentId) where.studentId = studentId;

  const [items, total] = await prisma.$transaction([
    prisma.paymentIntent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.paymentIntent.count({ where }),
  ]);
  return { items: items.map((p) => publicIntent({ ...p, transaction: null })), page, pageSize, total };
};

// --- Confirmation fournisseur : webhook + réconciliation ---------------------
// Point unique où un PaymentIntent bascule vers SUCCEEDED/FAILED.
// Le statut 'success' est REVÉRIFIÉ auprès de Jeko avant tout crédit (§9) :
// seul un accès API authentifié confirme le paiement — le corps du webhook
// sert de déclencheur, pas de preuve. Sans clés configurées (dev/test), on
// s'appuie sur le statut du webhook signé.

const fetchProviderStatus = async (intent) => {
  if (!jeko.isConfigured() || !intent.providerRef) return null;
  const remote = await jeko.getPaymentRequest(intent.providerRef);
  return remote?.status ?? null;
};

const applySuccess = async (intent) => {
  const updated = await ledger.withLedgerTransaction(async (tx) => {
    // Garde de transition atomique : un seul crédit même si webhook + reconcile
    // + retries Jeko arrivent en parallèle.
    const { count } = await tx.paymentIntent.updateMany({
      where: { id: intent.id, status: { in: ['CREATED', 'PENDING'] } },
      data: { status: 'SUCCEEDED' },
    });
    if (count === 0) return { intent, notifs: [], credited: false }; // déjà traité — idempotent

    const wallet = await tx.wallet.findUnique({ where: { studentId: intent.studentId } });
    if (!wallet) throw new ApiError(500, 'LEDGER_ERROR', 'Portefeuille élève introuvable');
    const { transaction } = await ledger.creditWalletTopup(tx, {
      walletId: wallet.id,
      amount: intent.amount,
      paymentIntentId: intent.id,
      initiatorId: intent.parentId,
      idempotencyKey: `topup:${intent.id}`,
    });

    // Notification de recharge confirmée DANS la tx : crédit et notification
    // cohérents (parent payeur + élève crédité, §2.C).
    const profile = await tx.studentProfile.findUnique({
      where: { id: intent.studentId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    const studentName = [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') || 'votre enfant';
    const notifs = await notify.notifyInTx(
      tx,
      await events.topupSucceeded(tx, intent, {
        studentUserId: profile.user.id,
        studentName,
        newBalance: transaction.walletBalanceAfter,
      }),
    );
    return {
      intent: await tx.paymentIntent.findUnique({ where: { id: intent.id } }),
      notifs,
      credited: true,
    };
  });
  if (updated.credited) notify.deliver(updated.notifs); // push post-commit
  return { intent: updated.intent ?? updated, credited: updated.credited };
};

// Échec DÉFINITIF seulement (§2.D) : jamais sur un statut PENDING/incertain.
const applyFailure = async (intent, failureReason) => {
  const { transitioned, notifs } = await ledger.withLedgerTransaction(async (tx) => {
    const { count } = await tx.paymentIntent.updateMany({
      where: { id: intent.id, status: { in: ['CREATED', 'PENDING'] } },
      data: { status: 'FAILED', failureReason },
    });
    if (count === 0) return { transitioned: false, notifs: [] };
    const profile = await tx.studentProfile.findUnique({
      where: { id: intent.studentId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    const studentName = [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') || 'votre enfant';
    const notifs = await notify.notifyInTx(
      tx,
      await events.topupFailed(tx, intent, { studentUserId: profile.user.id, studentName }),
    );
    return { transitioned: true, notifs };
  });
  if (transitioned) notify.deliver(notifs); // push post-commit, jamais dans la tx
  return transitioned;
};

// Entrée depuis le webhook : retrouve l'intent par notre référence ou l'id Jeko.
export const applyWebhookPayment = async ({ reference, providerTxnId, status }) => {
  const intent = await prisma.paymentIntent.findFirst({
    where: { OR: [{ reference: reference ?? '__none__' }, { providerRef: providerTxnId ?? '__none__' }] },
    include: { transaction: true },
  });
  if (!intent) return { matched: false };

  if (status === 'success') {
    // Re-vérification systématique du statut réel côté fournisseur.
    const remoteStatus = await fetchProviderStatus(intent);
    if (remoteStatus && remoteStatus !== 'success') {
      await applyFailure(intent, `provider_status_${remoteStatus}`);
      return { matched: true, credited: false, remoteStatus };
    }
    const { intent: updated, credited } = await applySuccess(intent);
    return { matched: true, credited: credited || updated.status === 'SUCCEEDED' };
  }

  if (status === 'error') {
    await applyFailure(intent, 'payment_failed');
  }
  return { matched: true, credited: false };
};

// Réconciliation à la demande (GET /:id/status) : un pay-in échoué n'envoie
// PAS de webhook (doc Jeko) — on interroge l'API pour trancher les PENDING.
export const reconcileTopup = async (user, id) => {
  const intent = await intentOr404(id);
  await assertCanView(user, intent);

  if (intent.status === 'SUCCEEDED' || intent.status === 'FAILED') {
    return publicIntent(intent);
  }
  if (intent.expiresAt && intent.expiresAt < new Date() && !intent.providerRef) {
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'EXPIRED' },
    });
    return publicIntent({ ...intent, status: 'EXPIRED' });
  }

  const remoteStatus = await fetchProviderStatus(intent);
  if (remoteStatus === 'success') {
    const { intent: updated } = await applySuccess(intent);
    return publicIntent(updated);
  }
  if (remoteStatus === 'error') {
    await applyFailure(intent, 'payment_failed');
    return publicIntent(await intentOr404(id));
  }
  if (intent.expiresAt && intent.expiresAt < new Date()) {
    const updated = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'EXPIRED' },
    });
    return publicIntent(updated);
  }
  return publicIntent(intent);
};
