import { prisma } from '../database/prisma.js';
import { businessRules } from '../config/businessRules.js';
import * as notify from '../modules/notifications/notifications.service.js';
import * as events from '../modules/notifications/events.js';

// ---------------------------------------------------------------------------
// Rappels de créneau (§2.E/F, §3) — persistance PostgreSQL, JAMAIS de
// setTimeout en mémoire : un redémarrage serveur ne perd aucun rappel.
//
// - scheduleForReservation() est appelé DANS la transaction de réservation :
//   rappels créés atomiquement avec la confirmation (dedupeKey = idempotence).
// - cancelForReservation() dans la transaction d'annulation/collecte.
// - Le worker réclame les rappels dus par updateMany conditionnel (claim
//   atomique, sûr en multi-instances) puis vérifie l'état réel de la
//   réservation au moment de l'envoi : annulée ou COLLECTED -> CANCELLED.
// ---------------------------------------------------------------------------

// Planifie les rappels de début et de fin de créneau pour l'élève et les
// parents associés dont la préférence est activée (opt-in, décision produit).
export const scheduleForReservation = async (tx, reservation, slot, { studentUserId }) => {
  const { beforeStartMinutes, beforeEndMinutes } = {
    beforeStartMinutes: businessRules.reminderBeforeStartMinutes,
    beforeEndMinutes: businessRules.reminderBeforeEndMinutes,
  };
  const times = events.reminderTimes(slot, {
    beforeStartMin: beforeStartMinutes,
    beforeEndMin: beforeEndMinutes,
  });

  const recipients = [{ userId: studentUserId, wants: 'self' }];
  // Parents liés APPROVED + préférence rappels enfants activée.
  const parents = await tx.user.findMany({
    where: {
      notifyChildReminders: true,
      parentLinks: { some: { studentId: reservation.studentId, status: 'APPROVED' } },
    },
    select: { id: true },
  });
  for (const p of parents) recipients.push({ userId: p.id, wants: 'child' });

  // Élève : sa préférence peut désactiver ses propres rappels.
  const student = await tx.user.findUnique({
    where: { id: studentUserId },
    select: { notifySlotReminders: true },
  });
  if (student && !student.notifySlotReminders) recipients.shift();

  const rows = recipients.flatMap(({ userId }) => [
    { dedupeKey: `${reservation.id}:${userId}:SLOT_START`, reservationId: reservation.id, userId, type: 'SLOT_START', runAt: times.start },
    { dedupeKey: `${reservation.id}:${userId}:SLOT_END`, reservationId: reservation.id, userId, type: 'SLOT_END', runAt: times.end },
  ]);
  // skipDuplicates = idempotence : une reprise/rejeu ne duplique rien (§9).
  await tx.scheduledReminder.createMany({ data: rows, skipDuplicates: true });
};

// Annule les rappels encore en attente (annulation de réservation ou repas
// déjà récupéré : la règle est "aucun rappel si COLLECTED", §2.F).
export const cancelForReservation = async (tx, reservationId) => {
  await tx.scheduledReminder.updateMany({
    where: { reservationId, status: 'PENDING' },
    data: { status: 'CANCELLED', processedAt: new Date() },
  });
};

// --- Worker de vérification périodique -------------------------------------

const BATCH = 20;
const STALE_PROCESSING_MS = 2 * 60_000; // récupère les claims orphelins (crash)

const processOne = async (reminder) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reminder.reservationId },
    include: { menuItem: { include: { dish: { select: { name: true } } } }, timeSlot: true },
  });

  // Règle fondamentale §2.F : plus de rappel si annulé ou repas déjà récupéré.
  if (!reservation || reservation.status !== 'CONFIRMED') {
    await prisma.scheduledReminder.update({
      where: { id: reminder.id },
      data: { status: 'CANCELLED', processedAt: new Date(), lastError: `reservation_${reservation?.status ?? 'missing'}` },
    });
    return;
  }

  try {
    const created = await notify.notify([
      events.slotReminder(reminder.userId, reservation, reminder.type),
    ]);
    notify.deliver(created);
    await prisma.scheduledReminder.update({
      where: { id: reminder.id },
      data: { status: 'SENT', processedAt: new Date() },
    });
  } catch (err) {
    const attempts = reminder.attempts + 1;
    await prisma.scheduledReminder.update({
      where: { id: reminder.id },
      data: {
        attempts,
        lastError: String(err?.message ?? err).slice(0, 300),
        // Retente au prochain tick tant que le quota n'est pas atteint.
        status: attempts >= businessRules.reminderMaxAttempts ? 'FAILED' : 'PENDING',
        ...(attempts >= businessRules.reminderMaxAttempts && { processedAt: new Date() }),
      },
    });
  }
};

const tick = async () => {
  const now = new Date();
  // Claim atomique : chaque rappel n'est pris qu'une fois, même si deux
  // instances tournent — le perdant voit count = 0 et passe au suivant (§9).
  const due = await prisma.scheduledReminder.findMany({
    where: {
      runAt: { lte: now },
      OR: [
        { status: 'PENDING' },
        { status: 'PROCESSING', updatedAt: { lt: new Date(now.getTime() - STALE_PROCESSING_MS) } },
      ],
    },
    orderBy: { runAt: 'asc' },
    take: BATCH,
  });
  for (const r of due) {
    const { count } = await prisma.scheduledReminder.updateMany({
      where: { id: r.id, OR: [{ status: 'PENDING' }, { status: 'PROCESSING' }] },
      data: { status: 'PROCESSING' },
    });
    if (count === 0) continue; // réclamé par une autre instance
    await processOne(r);
  }
};

let timer = null;
let running = false;

export const startReminderWorker = () => {
  if (timer) return;
  timer = setInterval(async () => {
    if (running) return; // pas de chevauchement si un tick dépasse l'intervalle
    running = true;
    try {
      await tick();
    } catch (err) {
      console.error('[reminders] tick:', err?.message);
    } finally {
      running = false;
    }
  }, businessRules.reminderPollMs);
  timer.unref?.(); // ne retarde jamais l'arrêt du process
  console.log(`[reminders] worker démarré (poll ${businessRules.reminderPollMs} ms)`);
};

export const stopReminderWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

// Exporté pour les tests : exécute un cycle manuel.
export const runOnce = tick;
