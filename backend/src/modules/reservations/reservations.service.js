import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { randomToken } from '../../utils/crypto.js';
import { slotStartUTC } from '../../utils/dates.js';
import { businessRules } from '../../config/businessRules.js';
import * as ledger from '../transactions/ledger.service.js';
import * as notify from '../notifications/notifications.service.js';
import * as events from '../notifications/events.js';
import * as reminders from '../../jobs/reminders.js';

// ---------------------------------------------------------------------------
// Réservations (spec §5, §6) — flux critique P0.
// Confirmation atomique (§8.3) dans UNE transaction PostgreSQL :
//   verrou élève -> contrôles -> compteurs atomiques -> débit portefeuille
//   (ledger) -> réservation CONFIRMED + QR token. Un échec annule TOUT.
// Jamais de surréservation : MenuItem.reservedCount et TimeSlot.reservedCount
// sont incrémentés par updateMany conditionnels réévalués sous verrou (§9).
// ---------------------------------------------------------------------------

const reservationInclude = {
  menuItem: { include: { dish: { include: { allergens: { include: { allergen: true } } } } } },
  timeSlot: true,
};

const publicReservation = (r, { includeQr = false } = {}) => ({
  id: r.id,
  status: r.status,
  priceSnapshot: r.priceSnapshot,
  currency: r.currency,
  menuItem: {
    id: r.menuItem.id,
    date: r.menuItem.date,
    dish: { id: r.menuItem.dish.id, name: r.menuItem.dish.name, photoUrl: r.menuItem.dish.photoUrl },
  },
  timeSlot: {
    id: r.timeSlot.id,
    date: r.timeSlot.date,
    startMinutes: r.timeSlot.startMinutes,
    endMinutes: r.timeSlot.endMinutes,
  },
  // Le QR ne doit être exposé qu'à l'élève propriétaire ou au personnel (§6).
  ...(includeQr && r.status === 'CONFIRMED' && { qrToken: r.qrToken }),
  confirmedAt: r.confirmedAt,
  cancelledAt: r.cancelledAt,
  createdAt: r.createdAt,
});

// Délai limite de réservation : surcharge par offre ou règle globale
// (À CONFIRMER §19 -> businessRules). Après l'heure limite, on refuse.
const reservationDeadline = (menuItem, slot) =>
  menuItem.reservationDeadline ??
  new Date(slotStartUTC(slot.date, slot.startMinutes).getTime() - businessRules.reservationCutoffMinutes * 60_000);

// --- Création : élève uniquement (§3.2 : l'élève réserve lui-même) ---
export const create = async (user, { menuItemId, timeSlotId, idempotencyKey }) => {
  const studentId = user.studentProfile?.id;
  if (!studentId) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');

  if (idempotencyKey) {
    const existing = await prisma.reservation.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.studentId !== studentId) {
        throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'Clé idempotente déjà utilisée');
      }
      return { reservation: await withIncludes(existing.id), replayed: true };
    }
  }

  // Codes d'échec qui justifient une notification à l'élève (§2.B) :
  // message clair, aucune allusion à un débit, jamais le parent.
  const NOTIFIABLE_FAILURES = new Set([
    'INSUFFICIENT_FUNDS', 'ITEM_SOLD_OUT', 'SLOT_FULL', 'RESERVATION_CLOSED',
    'ALLERGEN_BLOCKED', 'DATE_MISMATCH', 'LIMIT_REACHED', 'NOT_FOUND',
  ]);

  let reservation;
  let notifs = [];
  try {
    ({ reservation, notifs } = await ledger.withLedgerTransaction(async (tx) => {
    // Verrou de ligne sur le profil élève : sérialise les réservations
    // simultanées du MÊME élève (limite maxPerStudent fiable sous READ COMMITTED).
    await tx.$executeRaw`SELECT id FROM "StudentProfile" WHERE id = ${studentId} FOR UPDATE`;

    const [menuItem, slot] = await Promise.all([
      tx.menuItem.findUnique({ where: { id: menuItemId }, include: { dish: { include: { allergens: true } } } }),
      tx.timeSlot.findUnique({ where: { id: timeSlotId } }),
    ]);
    if (!menuItem || menuItem.status !== 'PUBLISHED') {
      throw new ApiError(404, 'NOT_FOUND', 'Offre introuvable ou non publiée');
    }
    if (!slot || !slot.isOpen) throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable ou fermé');
    if (slot.date.getTime() !== menuItem.date.getTime()) {
      throw new ApiError(422, 'DATE_MISMATCH', 'Le créneau ne correspond pas à la date de l\u2019offre');
    }
    if (Date.now() >= reservationDeadline(menuItem, slot).getTime()) {
      throw new ApiError(422, 'RESERVATION_CLOSED', 'L\u2019heure limite de réservation est passée');
    }

    // Blocage allergène DÉCIDÉ (§7) : correspondance déterministe entre
    // allergènes du plat et profil déclaré de l'élève.
    const studentAllergens = await tx.studentAllergen.findMany({
      where: { studentId },
      select: { allergenId: true },
    });
    const dishAllergenIds = new Set(menuItem.dish.allergens.map((a) => a.allergenId));
    const matched = studentAllergens.filter((a) => dishAllergenIds.has(a.allergenId));
    if (matched.length > 0) {
      throw new ApiError(422, 'ALLERGEN_BLOCKED', 'Ce plat contient un allergène déclaré dans votre profil', {
        allergenIds: matched.map((m) => m.allergenId),
      });
    }

    // Limite par élève : toute réservation non annulée compte (maxPerStudent).
    const held = await tx.reservation.count({
      where: { studentId, menuItemId, status: { not: 'CANCELLED' } },
    });
    if (held >= menuItem.maxPerStudent) {
      throw new ApiError(409, 'LIMIT_REACHED', 'Limite de réservation atteinte pour cette offre');
    }

    // Compteurs atomiques : la condition est réévaluée sur la ligne verrouillée,
    // donc deux demandes concurrentes pour la dernière portion ne passent pas
    // toutes les deux (§9 + scénario d'acceptation §18.8).
    const { count: slotOk } = await tx.timeSlot.updateMany({
      where: { id: slot.id, isOpen: true, reservedCount: { lt: slot.capacity } },
      data: { reservedCount: { increment: 1 } },
    });
    if (slotOk === 0) throw new ApiError(409, 'SLOT_FULL', 'Créneau complet ou fermé');

    const { count: itemOk } = await tx.menuItem.updateMany({
      where: { id: menuItem.id, status: 'PUBLISHED', reservedCount: { lt: menuItem.quantity } },
      data: { reservedCount: { increment: 1 } },
    });
    if (itemOk === 0) throw new ApiError(409, 'ITEM_SOLD_OUT', 'Quantité épuisée pour cette offre');

    const created = await tx.reservation.create({
      data: {
        studentId,
        menuItemId,
        timeSlotId,
        priceSnapshot: menuItem.price, // l'historique ne change pas (§4)
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        qrToken: randomToken(32), // non prédictible, usage unique (§6)
        idempotencyKey,
      },
    });

    // Débit du portefeuille + recette cantine, écriture liée à la réservation.
    // Échoue -> INSUFFICIENT_FUNDS -> rollback complet (compteurs inclus, §8.3).
    const wallet = await tx.wallet.upsert({
      where: { studentId },
      create: { studentId },
      update: {},
    });
    await ledger.payMeal(tx, {
      walletId: wallet.id,
      amount: menuItem.price,
      reservationId: created.id,
      initiatorId: user.id,
    });

    // Notifications + rappels créés dans la MÊME transaction : la réservation
    // et ses effets de bord sont cohérents ou rien (§8.3, §13).
    const assembled = {
      id: created.id, studentId, priceSnapshot: menuItem.price,
      menuItem: { date: menuItem.date, dish: { name: menuItem.dish.name } },
      timeSlot: slot,
    };
    const notifs = await notify.notifyInTx(
      tx,
      await events.reservationConfirmed(tx, assembled, { studentUserId: user.id }),
    );
    await reminders.scheduleForReservation(tx, created, slot, { studentUserId: user.id });
    return { reservation: created, notifs };
    }));
  } catch (err) {
    // Échec de réservation : l'élève est informé (aucun débit n'a eu lieu).
    if (err instanceof ApiError && NOTIFIABLE_FAILURES.has(err.code)) {
      notify
        .notify(events.reservationFailed(user.id, err.message))
        .then(notify.deliver)
        .catch(() => {});
    }
    throw err;
  }

  // Push post-commit, fire-and-forget (§13 : ne bloque ni n'annule jamais).
  notify.deliver(notifs);
  return { reservation: await withIncludes(reservation.id), replayed: false };
};

const withIncludes = (id) =>
  prisma.reservation.findUniqueOrThrow({ where: { id }, include: reservationInclude });

// --- Annulation : élève propriétaire ou admin, dans le délai autorisé ---
export const cancel = async (user, id) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { timeSlot: true, menuItem: { include: { dish: true } } },
  });
  if (!reservation) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');

  const isOwner = user.role === 'STUDENT' && reservation.studentId === user.studentProfile?.id;
  if (!isOwner && user.role !== 'ADMIN') {
    throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable'); // anti-IDOR
  }
  if (reservation.status !== 'CONFIRMED') {
    throw new ApiError(409, 'NOT_CANCELLABLE', `Réservation ${reservation.status} non annulable`);
  }
  // Délai d'annulation : règle À CONFIRMER isolée en config (§19).
  const deadline = new Date(
    slotStartUTC(reservation.timeSlot.date, reservation.timeSlot.startMinutes).getTime()
      - businessRules.cancellationCutoffMinutes * 60_000,
  );
  if (Date.now() >= deadline.getTime()) {
    throw new ApiError(422, 'CANCELLATION_CLOSED', 'Le délai d\u2019annulation est dépassé');
  }

  const notifs = await ledger.withLedgerTransaction(async (tx) => {
    // Transition d'état atomique : un seul appel concurrent gagne.
    const { count } = await tx.reservation.updateMany({
      where: { id: reservation.id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (count === 0) throw new ApiError(409, 'NOT_CANCELLABLE', 'Réservation déjà traitée');

    // Rappels annulés dans la même transaction : aucun rappel après annulation.
    await reminders.cancelForReservation(tx, reservation.id);

    // Libération des places réservées (compteurs symétriques à la création).
    await tx.menuItem.updateMany({
      where: { id: reservation.menuItemId, reservedCount: { gt: 0 } },
      data: { reservedCount: { decrement: 1 } },
    });
    await tx.timeSlot.updateMany({
      where: { id: reservation.timeSlotId, reservedCount: { gt: 0 } },
      data: { reservedCount: { decrement: 1 } },
    });

    // Remboursement = écriture compensatrice du débit initial (§8.5) :
    // jamais de suppression/modification de l'écriture d'origine.
    const payment = await tx.transaction.findUnique({
      where: { reservationId: reservation.id },
      select: { id: true },
    });
    if (payment) {
      await ledger.reverseTransaction(tx, payment.id, {
        initiatorId: user.id,
        reason: 'Annulation de réservation',
      });
    }

    // Notification d'annulation (élève + parents) — le remboursement est réel.
    const studentUser = await tx.user.findFirst({
      where: { studentProfile: { id: reservation.studentId } },
      select: { id: true },
    });
    return notify.notifyInTx(
      tx,
      await events.reservationCancelled(tx, reservation, { studentUserId: studentUser.id }),
    );
  });

  notify.deliver(notifs);
  return { reservation: await withIncludes(id) };
};

// --- Lectures par rôle (même portée que le journal financier) ---
const resolveScope = async (user, studentId) => {
  switch (user.role) {
    case 'ADMIN':
      return studentId ? { studentId } : { all: true };
    case 'STUDENT': {
      const ownId = user.studentProfile?.id;
      if (studentId && studentId !== ownId) throw new ApiError(404, 'NOT_FOUND', 'Élève introuvable');
      if (!ownId) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');
      return { studentId: ownId };
    }
    case 'PARENT': {
      if (!studentId) throw new ApiError(400, 'STUDENT_REQUIRED', 'Paramètre studentId requis');
      const link = await prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: user.id, studentId } },
        select: { status: true },
      });
      if (link?.status !== 'APPROVED') throw new ApiError(404, 'NOT_FOUND', 'Élève introuvable');
      return { studentId };
    }
    default:
      throw new ApiError(403, 'FORBIDDEN', 'Accès refusé');
  }
};

export const list = async (user, { page, pageSize, studentId, menuItemId, timeSlotId, date, status }) => {
  const scope = await resolveScope(user, studentId);
  const where = {
    ...(scope.all ? {} : { studentId: scope.studentId }),
    ...(menuItemId && { menuItemId }),
    ...(timeSlotId && { timeSlotId }),
    ...(status && { status }),
    ...(date && { menuItem: { date } }),
  };
  const [total, reservations] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reservationInclude,
    }),
  ]);
  const includeQr = user.role === 'STUDENT' || user.role === 'ADMIN';
  return {
    reservations: reservations.map((r) => publicReservation(r, { includeQr })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getById = async (user, id) => {
  const r = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude });
  if (!r) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
  if (user.role === 'ADMIN') return { reservation: publicReservation(r, { includeQr: true }) };
  if (user.role === 'STUDENT' && r.studentId === user.studentProfile?.id) {
    return { reservation: publicReservation(r, { includeQr: true }) };
  }
  if (user.role === 'PARENT') {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: user.id, studentId: r.studentId } },
      select: { status: true },
    });
    if (link?.status === 'APPROVED') return { reservation: publicReservation(r) };
  }
  throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
};
