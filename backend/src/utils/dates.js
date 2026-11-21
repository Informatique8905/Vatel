// Dates en UTC partout : Abidjan est en UTC+0 sans heure d'été — pas de piège
// de timezone si l'on reste cohérent. MenuItem.date et TimeSlot.date sont des
// @db.Date stockés à minuit UTC ; les minutes de créneau sont depuis minuit.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 'YYYY-MM-DD' -> Date à minuit UTC. Lance une erreur si le format est invalide.
export const utcDate = (str) => {
  if (!DATE_RE.test(str)) throw new Error(`Date attendue YYYY-MM-DD : ${str}`);
  return new Date(`${str}T00:00:00.000Z`);
};

// Date du jour à minuit UTC (comparaisons "aujourd'hui").
export const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Instant de début d'un créneau : minuit UTC de la date + startMinutes.
export const slotStartUTC = (date, startMinutes) =>
  new Date(date.getTime() + startMinutes * 60_000);
