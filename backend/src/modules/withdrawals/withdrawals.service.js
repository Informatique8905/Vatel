import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { makeReference } from '../../utils/crypto.js';
import * as ledger from '../transactions/ledger.service.js';
import * as jeko from '../integrations/jeko/jeko.client.js';

// ---------------------------------------------------------------------------
// Retraits de la cantine vers un bénéficiaire externe (spec §8.4).
// Cycle : REQUESTED (fonds réservés) -> PROCESSING (transfert envoyé à Jeko)
//       -> SUCCEEDED | FAILED.
// Les fonds sont DÉBITÉS du compte cantine interne dès la demande (réservation)
// — impossible de retirer deux fois le même solde. Un échec confirmé libère la
// réserve via une écriture REVERSAL, jamais une modification.
// Un retour 200 de POST /transfers = acceptation, PAS paiement : seul le
// webhook TRANSACTION_COMPLETED ou GET /transfers/{id} tranche.
// ---------------------------------------------------------------------------

const publicWithdrawal = (w) => ({
  id: w.id,
  reference: w.reference,
  operator: w.operator,
  beneficiary: w.beneficiary,
  amount: w.amount,
  fees: w.fees,
  currency: w.currency,
  status: w.status,
  providerRef: w.providerRef,
  failureReason: w.failureReason,
  confirmedAt: w.confirmedAt,
  createdAt: w.createdAt,
});

// Contact Jeko bénéficiaire : un contactId par (opérateur, numéro), réutilisé.
const ensureContact = async ({ operator, phone, name }) => {
  const cached = await prisma.jekoContact.findUnique({
    where: { operator_phone: { operator, phone } },
  });
  if (cached) return cached.contactId;

  const created = await jeko.createContact({ name: name ?? 'Bénéficiaire cantine', operator, phone });
  const contactId = created.id ?? created.contactId;
  try {
    await prisma.jekoContact.create({
      data: { operator, phone, contactId, name: name ?? null },
    });
  } catch {
    // Course de création : un autre retrait l'a enregistré entre-temps — réutiliser.
  }
  return contactId;
};

// Crée la demande + réserve les fonds, puis initie le transfert Jeko.
// Idempotent : même idempotencyKey -> le retrait existant est renvoyé.
export const createWithdrawal = async (admin, { amount, operator, beneficiaryPhone, beneficiaryName, idempotencyKey }) => {
  if (idempotencyKey) {
    const existing = await prisma.withdrawal.findUnique({ where: { idempotencyKey } });
    if (existing) return { withdrawal: publicWithdrawal(existing), replayed: true };
  }

  const reference = makeReference('WDR');
  let withdrawal;
  try {
    withdrawal = await ledger.withLedgerTransaction(async (tx) => {
      const w = await tx.withdrawal.create({
        data: {
          reference,
          initiatorId: admin.id,
          operator,
          beneficiary: beneficiaryPhone,
          amount,
          idempotencyKey,
          status: 'REQUESTED',
        },
      });
      // Débit immédiat = réservation (voir en-tête) ; échoue si solde insuffisant.
      await ledger.withdrawCanteen(tx, {
        amount,
        withdrawalId: w.id,
        initiatorId: admin.id,
        idempotencyKey: `withdraw:${w.id}`,
      });
      return w;
    });
  } catch (err) {
    if (err?.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.withdrawal.findUnique({ where: { idempotencyKey } });
      if (existing) return { withdrawal: publicWithdrawal(existing), replayed: true };
    }
    throw err;
  }

  try {
    const contactId = await ensureContact({
      operator,
      phone: beneficiaryPhone,
      name: beneficiaryName,
    });
    const transfer = await jeko.createTransfer({
      reference,
      contactId,
      amountXof: amount,
      description: `Retrait cantine ${reference}`,
    });
    withdrawal = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        providerRef: transfer.id,
        status: transfer.status === 'success' ? 'SUCCEEDED' : 'PROCESSING',
        ...(transfer.status === 'success' ? { confirmedAt: new Date() } : {}),
      },
    });
  } catch (err) {
    // Échec AVANT envoi confirmé au fournisseur : libérer la réservation.
    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findUnique({ where: { withdrawalId: withdrawal.id } });
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'FAILED', failureReason: err.code ?? 'JEKO_ERROR' },
      });
      if (txn) {
        await ledger.reverseTransaction(tx, txn.id, {
          initiatorId: admin.id,
          reason: `Échec initiation Jeko : ${err.code ?? 'JEKO_ERROR'}`,
        });
      }
    });
    throw err;
  }
  return { withdrawal: publicWithdrawal(withdrawal), replayed: false };
};

// Statut fournisseur (webhook TRANSACTION_COMPLETED, transactionType 'transfer')
// ou réconciliation. Frais Jeko (centimes) débités du compte cantine en
// ADJUSTMENT séparé une fois connus — jamais d'update sur l'écriture initiale.
export const applyProviderStatus = async ({ reference, providerTxnId, status, feesCents }) => {
  const withdrawal = await prisma.withdrawal.findFirst({
    where: { OR: [{ reference: reference ?? '__none__' }, { providerRef: providerTxnId ?? '__none__' }] },
  });
  if (!withdrawal) return { matched: false };

  const feesXof = Math.round((feesCents ?? 0) / 100);

  if (status === 'success') {
    const { count } = await prisma.withdrawal.updateMany({
      where: { id: withdrawal.id, status: { in: ['REQUESTED', 'PROCESSING'] } },
      data: { status: 'SUCCEEDED', confirmedAt: new Date(), fees: feesXof },
    });
    if (count === 0) return { matched: true, applied: 'SUCCEEDED' }; // idempotent
    // Frais fournisseur : écriture ADJUSTMENT séparée. Si le compte ne peut pas
    // l'absorber, le statut SUCCEEDED reste acquis — les frais restent
    // consignés sur Withdrawal.fees pour réconciliation externe.
    if (feesXof > 0) {
      await ledger
        .withLedgerTransaction((tx) =>
          ledger.postEntry(tx, {
            type: 'ADJUSTMENT',
            amount: feesXof,
            canteenDelta: -feesXof,
            initiatorId: withdrawal.initiatorId,
            idempotencyKey: `withdraw-fees:${withdrawal.id}`,
            metadata: { withdrawalId: withdrawal.id, reason: 'Frais fournisseur Jeko' },
          }),
        )
        .catch(() => {});
    }
    return { matched: true, applied: 'SUCCEEDED' };
  }

  if (status === 'error') {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.withdrawal.updateMany({
        where: { id: withdrawal.id, status: { in: ['REQUESTED', 'PROCESSING'] } },
        data: { status: 'FAILED', failureReason: 'transfer_failed' },
      });
      if (count === 0) return;
      const txn = await tx.transaction.findUnique({ where: { withdrawalId: withdrawal.id } });
      if (txn) {
        await ledger.reverseTransaction(tx, txn.id, {
          initiatorId: withdrawal.initiatorId,
          reason: 'Transfert Jeko échoué — libération de la réservation',
        });
      }
    });
    return { matched: true, applied: 'FAILED' };
  }
  return { matched: true, applied: 'PENDING' };
};

export const listWithdrawals = async ({ page, pageSize, status }) => {
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.withdrawal.count({ where }),
  ]);
  return { items: items.map(publicWithdrawal), page, pageSize, total };
};

export const getWithdrawal = async (id) => {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) throw new ApiError(404, 'WITHDRAWAL_NOT_FOUND', 'Retrait introuvable');
  return publicWithdrawal(withdrawal);
};
