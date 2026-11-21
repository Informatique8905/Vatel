import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { todayUTC } from '../../utils/dates.js';
import * as reminders from '../../jobs/reminders.js';

// ---------------------------------------------------------------------------
// Remise des repas (spec §6) — réservé au personnel (ADMIN).
// Voie principale : scan du QR token opaque. Plan B DÉCIDÉ : validation
// manuelle depuis la liste du créneau. Un jeton ne sert qu'une fois :
// la transition CONFIRMED -> COLLECTED est atomique ET DistributionRecord
// a un unique sur reservationId — un second scan est refusé dans tous les cas.
// ---------------------------------------------------------------------------

const publicDistribution = (d) => ({
  id: d.id,
  reservationId: d.reservationId,
  method: d.method,
  agentId: d.agentId,
  collectedAt: d.collectedAt,
});

const publicRow = (r) => ({
  reservationId: r.id,
  status: r.status,
  student: {
    id: r.student.id,
    name: [r.student.user.firstName, r.student.user.lastName].filter(Boolean).join(' '),
    kind: r.student.kind,
  },
  menuItem: { id: r.menuItem.id, dish: r.menuItem.dish.name },
  timeSlot: { id: r.timeSlot.id, startMinutes: r.timeSlot.startMinutes, endMinutes: r.timeSlot.endMinutes },
  distribution: r.distribution ? publicDistribution(r.distribution) : null,
});

// Contrôles communs scan / manuel puis passage à COLLECTED (§6).
const collect = async (reservation, { agentId, method }) => {
  if (!reservation) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
  if (reservation.distribution) {
    throw new ApiError(409, 'ALREADY_COLLECTED', 'Repas déjà récupéré', {
      collectedAt: reservation.distribution.collectedAt,
    });
  }
  if (reservation.status !== 'CONFIRMED') {
    throw new ApiError(409, 'NOT_COLLECTABLE', `Réservation ${reservation.status} non distribuable`);
  }
  // Vérification de la date : le repas est remis le jour du service prévu (§6).
  if (reservation.menuItem.date.getTime() !== todayUTC().getTime()) {
    throw new ApiError(422, 'WRONG_DATE', 'Cette réservation ne correspond pas au service du jour');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Transition atomique : si un autre scan est passé entre-temps, count = 0.
      const { count } = await tx.reservation.updateMany({
        where: { id: reservation.id, status: 'CONFIRMED' },
        data: { status: 'COLLECTED' },
      });
      if (count === 0) {
        throw new ApiError(409, 'ALREADY_COLLECTED', 'Repas déjà récupéré');
      }
      // Règle §2.F : aucun rappel une fois le repas récupéré.
      await reminders.cancelForReservation(tx, reservation.id);
      return tx.distributionRecord.create({
        data: { reservationId: reservation.id, agentId, method },
      });
    });
  } catch (err) {
    // Filet de sécurité : unicité reservationId (un seul enregistrement).
    if (err?.code === 'P2002') {
      throw new ApiError(409, 'ALREADY_COLLECTED', 'Repas déjà récupéré');
    }
    throw err;
  }
};

const findForScan = (qrToken) =>
  prisma.reservation.findUnique({
    where: { qrToken },
    include: {
      menuItem: { include: { dish: { select: { name: true } } } },
      timeSlot: true,
      distribution: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

export const scan = async (agent, { token }) => {
  const reservation = await findForScan(token);
  const distribution = await collect(reservation, { agentId: agent.id, method: 'QR_SCAN' });
  return { distribution: publicDistribution(distribution), reservation: reservation && publicRow(reservation) };
};

export const manual = async (agent, { reservationId }) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      menuItem: { include: { dish: { select: { name: true } } } },
      timeSlot: true,
      distribution: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  const distribution = await collect(reservation, { agentId: agent.id, method: 'MANUAL' });
  return { distribution: publicDistribution(distribution), reservation: reservation && publicRow(reservation) };
};

// Plan B : liste du créneau/jour pour validation manuelle (§6 DÉCIDÉ).
export const listForDistribution = async ({ timeSlotId, date }) => {
  const rows = await prisma.reservation.findMany({
    where: {
      ...(timeSlotId && { timeSlotId }),
      ...(date && { timeSlot: { date } }),
      status: { in: ['CONFIRMED', 'COLLECTED'] },
    },
    orderBy: [{ status: 'desc' }, { createdAt: 'asc' }], // CONFIRMED d'abord
    include: {
      menuItem: { include: { dish: { select: { name: true } } } },
      timeSlot: true,
      distribution: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  return { reservations: rows.map(publicRow) };
};
