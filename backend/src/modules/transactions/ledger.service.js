import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { makeReference } from '../../utils/crypto.js';

// ---------------------------------------------------------------------------
// Journal financier (spec §8.5) — source de vérité.
// TOUTE variation de solde passe par postEntry() DANS une transaction Prisma :
// écriture Transaction + mise à jour atomique du solde, ou rien (rollback §8.3).
// Jamais d'UPDATE sur une écriture passée — les corrections sont des écritures
// REVERSAL / ADJUSTMENT compensatrices.
// ---------------------------------------------------------------------------

const CANTEEN_ID = 1; // compte interne de la cantine, singleton (spec §8.1)

const requirePositiveInt = (amount) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, 'BAD_AMOUNT', 'Montant invalide : entier XOF positif requis');
  }
};

// Delta signé sur un portefeuille avec garde anti-découvert atomique :
// le UPDATE ... WHERE balance >= X est réévalué sur la ligne verrouillée, donc
// deux débits concurrents ne peuvent pas passer tous les deux (spec §9).
const applyWalletDelta = async (tx, walletId, delta) => {
  const abs = Math.abs(delta);
  if (delta < 0) {
    const { count } = await tx.wallet.updateMany({
      where: { id: walletId, balance: { gte: abs } },
      data: { balance: { decrement: abs }, version: { increment: 1 } },
    });
    if (count === 0) {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId }, select: { id: true } });
      if (!wallet) throw new ApiError(404, 'WALLET_NOT_FOUND', 'Portefeuille introuvable');
      throw new ApiError(422, 'INSUFFICIENT_FUNDS', 'Solde du portefeuille insuffisant');
    }
  } else {
    const { count } = await tx.wallet.updateMany({
      where: { id: walletId },
      data: { balance: { increment: abs }, version: { increment: 1 } },
    });
    if (count === 0) throw new ApiError(404, 'WALLET_NOT_FOUND', 'Portefeuille introuvable');
  }
  const { balance } = await tx.wallet.findUniqueOrThrow({
    where: { id: walletId },
    select: { balance: true },
  });
  return balance;
};

// Même garde sur le compte cantine : pas de sortie de fonds au-delà du solde.
const applyCanteenDelta = async (tx, delta) => {
  await tx.canteenAccount.upsert({
    where: { id: CANTEEN_ID },
    create: { id: CANTEEN_ID },
    update: {},
  });
  const abs = Math.abs(delta);
  if (delta < 0) {
    const { count } = await tx.canteenAccount.updateMany({
      where: { id: CANTEEN_ID, balance: { gte: abs } },
      data: { balance: { decrement: abs }, version: { increment: 1 } },
    });
    if (count === 0) throw new ApiError(422, 'INSUFFICIENT_CANTEEN_FUNDS', 'Solde cantine insuffisant');
  } else {
    await tx.canteenAccount.updateMany({
      where: { id: CANTEEN_ID },
      data: { balance: { increment: abs }, version: { increment: 1 } },
    });
  }
  const { balance } = await tx.canteenAccount.findUniqueOrThrow({
    where: { id: CANTEEN_ID },
    select: { balance: true },
  });
  return balance;
};

// Écriture de ledger générique. À appeler UNIQUEMENT dans un callback
// prisma.$transaction (ou withLedgerTransaction) : la mise à jour des soldes et
// la création de l'écriture doivent être atomiques.
//
// - amount : entier XOF positif ; le sens est porté par walletDelta/canteenDelta.
// - walletDelta / canteenDelta : variations signées (0 = compte non touché).
// - idempotencyKey : si une écriture existe déjà pour cette clé, elle est
//   renvoyée telle quelle (replayed: true) — aucune seconde opération (§9).
export const postEntry = async (
  tx,
  {
    type,
    amount,
    walletId = null,
    walletDelta = 0,
    canteenDelta = 0,
    reservationId,
    paymentIntentId,
    withdrawalId,
    reversesId,
    initiatorId,
    idempotencyKey,
    metadata,
  },
) => {
  requirePositiveInt(amount);
  if (walletDelta !== 0 && !walletId) {
    throw new ApiError(500, 'LEDGER_ERROR', 'Écriture portefeuille sans walletId');
  }

  if (idempotencyKey) {
    const existing = await tx.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) return { transaction: existing, replayed: true };
  }

  const walletBalanceAfter =
    walletDelta !== 0 ? await applyWalletDelta(tx, walletId, walletDelta) : null;
  const canteenBalanceAfter =
    canteenDelta !== 0 ? await applyCanteenDelta(tx, canteenDelta) : null;

  const transaction = await tx.transaction.create({
    data: {
      reference: makeReference('TXN'),
      type,
      amount,
      walletId,
      walletBalanceAfter,
      canteenBalanceAfter,
      reservationId,
      paymentIntentId,
      withdrawalId,
      reversesId,
      initiatorId,
      idempotencyKey,
      // Les deltas signés sont persistés : chaque écriture reste inversible
      // sans interpréter son type.
      metadata: { ...metadata, walletDelta, canteenDelta },
    },
  });
  return { transaction, replayed: false };
};

// --- Écritures typées utilisées par les modules métier ---

// TOPUP : crédit après recharge externe confirmée (webhook vérifié, §8.2).
export const creditWalletTopup = (tx, { walletId, amount, paymentIntentId, initiatorId, idempotencyKey }) =>
  postEntry(tx, {
    type: 'TOPUP',
    amount,
    walletId,
    walletDelta: amount,
    paymentIntentId,
    initiatorId,
    idempotencyKey,
  });

// MEAL_PAYMENT : débit portefeuille élève + recette cantine (§8.3).
export const payMeal = (tx, { walletId, amount, reservationId, initiatorId, idempotencyKey }) =>
  postEntry(tx, {
    type: 'MEAL_PAYMENT',
    amount,
    walletId,
    walletDelta: -amount,
    canteenDelta: amount,
    reservationId,
    initiatorId,
    idempotencyKey,
  });

// WITHDRAWAL : sortie des fonds cantine (§8.4). Le solde est débité à la
// création de la demande = fonds réservés ; un échec confirmé se libère via
// reverseTransaction().
export const withdrawCanteen = (tx, { amount, withdrawalId, initiatorId, idempotencyKey }) =>
  postEntry(tx, {
    type: 'WITHDRAWAL',
    amount,
    canteenDelta: -amount,
    withdrawalId,
    initiatorId,
    idempotencyKey,
  });

// ADJUSTMENT : correction documentée sur un portefeuille (§8.5).
export const adjustWallet = (tx, { walletId, delta, initiatorId, reason }) =>
  postEntry(tx, {
    type: 'ADJUSTMENT',
    amount: Math.abs(delta),
    walletId,
    walletDelta: delta,
    initiatorId,
    metadata: { reason },
  });

// Compense une écriture COMPLETED par son exacte inverse (§8.5).
// Deux gardes anti-doublon : passage atomique à REVERSED + unicité de
// reversesId — une écriture ne peut être compensée qu'une seule fois.
export const reverseTransaction = async (tx, transactionId, { initiatorId, reason } = {}) => {
  const original = await tx.transaction.findUnique({ where: { id: transactionId } });
  if (!original) throw new ApiError(404, 'TXN_NOT_FOUND', 'Écriture introuvable');
  if (original.type === 'REVERSAL') {
    throw new ApiError(400, 'CANNOT_REVERSE', 'Une écriture REVERSAL ne peut pas être compensée');
  }
  const { count } = await tx.transaction.updateMany({
    where: { id: original.id, status: 'COMPLETED' },
    data: { status: 'REVERSED' },
  });
  if (count === 0) {
    throw new ApiError(409, 'ALREADY_REVERSED', 'Écriture déjà compensée ou non compensable');
  }
  const { walletDelta = 0, canteenDelta = 0 } = original.metadata ?? {};
  // Pas de reservationId/paymentIntentId/withdrawalId sur la compensation :
  // ces champs sont uniques et déjà portés par l'écriture d'origine.
  const { transaction } = await postEntry(tx, {
    type: 'REVERSAL',
    amount: original.amount,
    walletId: original.walletId,
    walletDelta: -walletDelta,
    canteenDelta: -canteenDelta,
    reversesId: original.id,
    initiatorId,
    metadata: { reason, originalReference: original.reference },
  });
  return transaction;
};

// Exécute un lot d'écritures dans une transaction PostgreSQL (§9).
// En cas de course sur une clé d'idempotence, le perdant reçoit 409 — une
// répétition renverra alors l'écriture déjà créée.
export const withLedgerTransaction = (work) =>
  prisma.$transaction(work).catch((err) => {
    if (err?.code === 'P2002' && String(err?.meta?.target ?? '').includes('idempotencyKey')) {
      throw new ApiError(409, 'IDEMPOTENCY_RACE', 'Opération identique déjà en cours, réessayez');
    }
    throw err;
  });
