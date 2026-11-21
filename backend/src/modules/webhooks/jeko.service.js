import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import * as jeko from '../integrations/jeko/jeko.client.js';
import * as payments from '../payments/payments.service.js';
import * as withdrawals from '../withdrawals/withdrawals.service.js';

// ---------------------------------------------------------------------------
// Réception des notifications Jeko (spec §8.2/§8.4 + doc webhooks Jeko).
// - Corps BRUT obligatoire : Jeko-Signature = HMAC-SHA256(secret, rawBody) hex.
// - Jeko-Event : TRANSACTION_COMPLETED (payment | transfer).
// - Anti-rejeu : WebhookEvent.eventId unique — un événement déjà traité est
//   ignoré ; un événement FAILED est retraité (retry Jeko ×3 documenté).
// - Répondre 2xx rapidement ; 500 -> Jeko retente (sûr car idempotent).
// ---------------------------------------------------------------------------

// Le corps du webhook EST la transaction : {id, amount{amount,currency},
// fees{amount,currency}, status, transactionType, transactionDetails:{id, reference}}
const dispatch = async (payload) => {
  const reference = payload?.transactionDetails?.reference;
  const providerTxnId = payload?.transactionDetails?.id ?? payload?.id;
  const status = payload?.status;
  const feesCents = payload?.fees?.amount ?? payload?.fees;

  if (payload?.transactionType === 'payment') {
    const r = await payments.applyWebhookPayment({ reference, providerTxnId, status });
    return { handler: 'payment', ...r };
  }
  if (payload?.transactionType === 'transfer') {
    const r = await withdrawals.applyProviderStatus({ reference, providerTxnId, status, feesCents });
    return { handler: 'transfer', ...r };
  }
  return { handler: 'none', matched: false };
};

export const handleJekoWebhook = async ({ rawBody, signature, event }) => {
  if (!jeko.verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(401, 'INVALID_SIGNATURE', 'Signature webhook invalide');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Corps webhook non JSON');
  }

  const eventId = `${event ?? 'UNKNOWN'}:${payload?.id ?? 'no-id'}`;

  // Idempotence : P2002 ou statut PROCESSED = déjà vu -> ignoré sans retraiter.
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existing?.status === 'PROCESSED' || existing?.status === 'IGNORED') {
    return { duplicate: true, eventId };
  }
  const record = existing ??
    (await prisma.webhookEvent
      .create({ data: { provider: 'jeko', eventId, signatureOk: true, payload } })
      .catch((err) => {
        if (err?.code === 'P2002') return null; // perdu la course -> l'autre traite
        throw err;
      }));
  if (!record) return { duplicate: true, eventId };

  if (event !== 'TRANSACTION_COMPLETED') {
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { status: 'IGNORED', processedAt: new Date() },
    });
    return { ignored: true, eventId, event };
  }

  try {
    const result = await dispatch(payload);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
    return { eventId, ...result };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { status: 'FAILED' },
    });
    throw err; // 500 -> Jeko retente ; l'anti-rejeu rend la tentative sûre
  }
};
