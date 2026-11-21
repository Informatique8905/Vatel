import { slotStartUTC } from '../../utils/dates.js';

// ---------------------------------------------------------------------------
// Construction des messages de notification par événement métier (spec §13).
// Messages FR, explicites, jamais de confusion sur un éventuel débit.
// ---------------------------------------------------------------------------

const fmtDate = (d) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtTime = (minutes) =>
  `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
export const fmtAmount = (xof) => `${xof.toLocaleString('fr-FR')} FCFA`;

// Parents APPROVED liés à un élève (un lien révoqué coupe immédiatement les
// notifications — spec liaison §6).
export const linkedParentIds = async (tx, studentId) => {
  const links = await tx.parentStudent.findMany({
    where: { studentId, status: 'APPROVED' },
    select: { parentId: true },
  });
  return links.map((l) => l.parentId);
};

export const slotLabel = (slot) =>
  `entre ${fmtTime(slot.startMinutes)} et ${fmtTime(slot.endMinutes)}`;

export const mealLabel = (r) =>
  `${r.menuItem.dish.name} le ${fmtDate(r.menuItem.date)} ${slotLabel(r.timeSlot)}`;

// --- Réservation confirmée : élève + parents associés (§2.A) ---
export const reservationConfirmed = async (tx, r, { studentUserId }) => {
  const entries = [{
    userId: studentUserId,
    type: 'RESERVATION_CONFIRMED',
    dedupeKey: `resa-ok:${r.id}`,
    title: 'Réservation confirmée',
    body: `Ton repas est réservé : ${r.menuItem.dish.name}, le ${fmtDate(r.menuItem.date)} ${slotLabel(r.timeSlot)}. ${fmtAmount(r.priceSnapshot)} débités.`,
    payload: { url: `/student/reservations/${r.id}`, reservationId: r.id },
  }];
  const parents = await linkedParentIds(tx, r.studentId);
  for (const parentId of parents) {
    entries.push({
      userId: parentId,
      type: 'CHILD_RESERVATION',
      dedupeKey: `resa-ok-parent:${r.id}:${parentId}`,
      title: 'Repas réservé par votre enfant',
      body: `Votre enfant a réservé ${r.menuItem.dish.name} pour le ${fmtDate(r.menuItem.date)} ${slotLabel(r.timeSlot)}. ${fmtAmount(r.priceSnapshot)} débités du portefeuille.`,
      payload: { url: '/parent/reservations', reservationId: r.id },
    });
  }
  return entries;
};

// --- Réservation échouée : élève seul, jamais d'allusion à un débit (§2.B) ---
export const reservationFailed = (userId, reason) => [{
  userId,
  type: 'RESERVATION_FAILED',
  title: 'Réservation impossible',
  body: `${reason} Aucun montant n'a été débité.`,
  payload: { url: '/student/menus' },
}];

// --- Annulation : élève + parents ---
export const reservationCancelled = async (tx, r, { studentUserId }) => {
  const entries = [{
    userId: studentUserId,
    type: 'RESERVATION_CANCELLED',
    dedupeKey: `resa-cancel:${r.id}`,
    title: 'Réservation annulée',
    body: `Ta réservation ${r.menuItem.dish.name} du ${fmtDate(r.menuItem.date)} a été annulée et ${fmtAmount(r.priceSnapshot)} recrédités.`,
    payload: { url: '/student/reservations', reservationId: r.id },
  }];
  const parents = await linkedParentIds(tx, r.studentId);
  for (const parentId of parents) {
    entries.push({
      userId: parentId,
      type: 'CHILD_RESERVATION_CANCELLED',
      dedupeKey: `resa-cancel-parent:${r.id}:${parentId}`,
      title: 'Réservation annulée',
      body: `La réservation de repas de votre enfant du ${fmtDate(r.menuItem.date)} a été annulée et le montant recrédité.`,
      payload: { url: '/parent/reservations' },
    });
  }
  return entries;
};

// --- Recharge confirmée : parent payeur + élève crédité (§2.C) ---
export const topupSucceeded = async (tx, intent, { studentUserId, studentName, newBalance }) => [{
  userId: intent.parentId,
  type: 'TOPUP_SUCCEEDED',
  dedupeKey: `topup-ok:${intent.id}`,
  title: 'Rechargement réussi',
  body: `Tu as ajouté ${fmtAmount(intent.amount)} au portefeuille de ${studentName}.`,
  payload: { url: '/parent/portefeuille', paymentIntentId: intent.id },
}, {
  userId: studentUserId,
  type: 'TOPUP_SUCCEEDED',
  dedupeKey: `topup-ok-student:${intent.id}`,
  title: 'Portefeuille rechargé',
  body: `Ton portefeuille a été crédité de ${fmtAmount(intent.amount)}.${newBalance != null ? ` Nouveau solde : ${fmtAmount(newBalance)}.` : ''}`,
  payload: { url: '/student/portefeuille' },
}];

// --- Recharge définitivement échouée (§2.D : jamais sur statut incertain) ---
export const topupFailed = async (tx, intent, { studentUserId, studentName }) => [{
  userId: intent.parentId,
  type: 'TOPUP_FAILED',
  dedupeKey: `topup-ko:${intent.id}`,
  title: 'Rechargement échoué',
  body: `Le rechargement de ${fmtAmount(intent.amount)} pour ${studentName} a échoué. Aucun montant n'a été crédité au portefeuille.`,
  payload: { url: '/parent/recharge' },
}, {
  userId: studentUserId,
  type: 'TOPUP_FAILED',
  dedupeKey: `topup-ko-student:${intent.id}`,
  title: 'Rechargement non abouti',
  body: `Un rechargement de ${fmtAmount(intent.amount)} vers ton portefeuille n'a pas abouti. Ton solde n'a pas changé.`,
  payload: { url: '/student/portefeuille' },
}];

// --- Rappels de créneau (§2.E/F) ---
export const slotReminder = (userId, r, kind) => ({
  userId,
  type: kind === 'SLOT_START' ? 'SLOT_START_REMINDER' : 'SLOT_END_REMINDER',
  dedupeKey: `reminder:${r.id}:${userId}:${kind}`,
  title: kind === 'SLOT_START' ? 'Ton repas t\u2019attend' : 'Dernier rappel',
  body: kind === 'SLOT_START'
    ? `Ton créneau de récupération commence dans quelques minutes (${slotLabel(r.timeSlot)}). Présente ton QR code à la cantine.`
    : `Ton créneau de récupération se termine dans quelques minutes (${slotLabel(r.timeSlot)}). N\u2019oublie pas de récupérer ton repas.`,
  payload: { url: `/student/reservations/${r.id}`, reservationId: r.id },
});

// --- Liaison parent-enfant ---
export const linkCreated = (parentUserId, studentUserId, { parentName, studentName }) => [{
  userId: parentUserId,
  type: 'LINK_CREATED',
  title: 'Liaison créée',
  body: `Ton compte est désormais associé à ${studentName}. Si cette liaison est une erreur, tu peux la révoquer depuis ton profil.`,
  payload: { url: '/parent/enfants' },
}, {
  userId: studentUserId,
  type: 'LINK_CREATED',
  title: 'Liaison créée',
  body: `Ton compte est désormais associé à ${parentName} (parent). Si cette liaison est une erreur, tu peux la révoquer depuis ton profil.`,
  payload: { url: '/student/profil' },
}];

export const linkRevoked = (notifyUserId, otherName) => [{
  userId: notifyUserId,
  type: 'LINK_REVOKED',
  title: 'Liaison révoquée',
  body: `La liaison avec ${otherName} a été révoquée.`,
  payload: { url: '/' },
}];

// Calcul des instants de rappel depuis le créneau (UTC, Abidjan = UTC+0).
export const reminderTimes = (slot, { beforeStartMin, beforeEndMin }) => ({
  start: new Date(slotStartUTC(slot.date, slot.startMinutes).getTime() - beforeStartMin * 60_000),
  end: new Date(slotStartUTC(slot.date, slot.endMinutes).getTime() - beforeEndMin * 60_000),
});
