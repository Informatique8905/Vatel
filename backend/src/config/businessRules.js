// Règles métier marquées À CONFIRMER dans le cahier des charges (§19).
// Valeurs PROVISOIRES isolées ici — une seule source à modifier quand
// l'équipe tranchera. Ne pas coder ces règles en dur ailleurs.

const int = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const businessRules = {
  // À CONFIRMER : heure limite de réservation avant le service (minutes)
  reservationCutoffMinutes: int('RESERVATION_CUTOFF_MINUTES', 120),
  // À CONFIRMER : délai d'annulation autorisé avant le service (minutes)
  cancellationCutoffMinutes: int('CANCELLATION_CUTOFF_MINUTES', 60),
  // À CONFIRMER : seuil d'alerte "solde faible" en XOF
  lowBalanceThresholdXof: int('LOW_BALANCE_THRESHOLD_XOF', 500),
  // À CONFIRMER : politique repas payé non récupéré — false = débit conservé
  notCollectedRefund: process.env.NOT_COLLECTED_REFUND === 'true',
  // Rappels de créneau (notifications push) — paramétrables, jamais en dur
  reminderBeforeStartMinutes: int('REMINDER_BEFORE_START_MINUTES', 5),
  reminderBeforeEndMinutes: int('REMINDER_BEFORE_END_MINUTES', 5),
  reminderPollMs: int('REMINDER_POLL_MS', 30_000),
  reminderMaxAttempts: int('REMINDER_MAX_ATTEMPTS', 3),
};
