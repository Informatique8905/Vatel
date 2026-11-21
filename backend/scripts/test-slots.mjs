// Batterie de tests du module créneaux (spec §9 du module).
// Usage : node --env-file=.env scripts/test-slots.mjs
import { prisma } from '../src/database/prisma.js';

const API = 'http://localhost:4000/api';
const RUN = Date.now().toString(36);
const jar = {};
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  OK ' : ' FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const loginFull = async (email, who) => {
  const r0 = await fetch(`${API}/health`);
  const c0 = r0.headers.get('set-cookie') ?? '';
  const token = decodeURIComponent(/csrf_token=([^;]+)/.exec(c0)?.[1] ?? '');
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: c0, 'x-csrf-token': token },
    body: JSON.stringify({ email, password: 'VatelDemo2026!' }),
  });
  const sc = r.headers.get('set-cookie') ?? '';
  jar[who] = [c0, ...sc.split(/,(?=\s*\w+=)/).map((c) => c.split(';')[0])].join('; ');
  jar[who + ':csrf'] = decodeURIComponent(/csrf_token=([^;]+)/.exec(jar[who])?.[1] ?? token);
  return { status: r.status, data: await r.json() };
};

const authed = (method, path, { as, body } = {}) =>
  fetch(API + path, {
    method,
    headers: {
      Cookie: jar[as],
      'x-csrf-token': jar[as + ':csrf'],
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));

// --- fixtures -----------------------------------------------------------------
const aya = await prisma.studentProfile.findFirst({ include: { wallet: true, user: true } });
const admin = await prisma.user.findUnique({ where: { email: 'admin@cantine-vatel.demo' } });
const DATE = '2027-06-15';
const dateObj = new Date(DATE + 'T00:00:00.000Z');

const dish = await prisma.dish.create({ data: { name: 'Plat slots ' + RUN } });
const menuItem = await prisma.menuItem.create({
  data: { dishId: dish.id, date: dateObj, price: 500, quantity: 100, status: 'PUBLISHED' },
});
await prisma.wallet.update({ where: { id: aya.wallet.id }, data: { balance: 100000 } });

await loginFull('admin@cantine-vatel.demo', 'admin');
await loginFull('aya.konan@exemple.ci', 'student');

// --- 1-4 : création / validation ------------------------------------------------
const c1 = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Service midi ' + RUN, date: DATE, startMinutes: 660, endMinutes: 690, capacity: 50 },
});
check('création créneau valide -> 201 + label', c1.status === 201 && c1.data?.slots?.[0]?.label?.startsWith('Service midi'), JSON.stringify(c1.data?.slots?.[0]?.id));
const slotId = c1.data.slots[0].id;

const c2 = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Inv', date: DATE, startMinutes: 700, endMinutes: 660, capacity: 10 },
});
check('fin avant début -> 400', c2.status === 400);

const c3 = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Inv', date: DATE, startMinutes: 700, endMinutes: 720, capacity: 0 },
});
check('capacité 0 -> 400', c3.status === 400);
const c3b = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Inv', date: DATE, startMinutes: 700, endMinutes: 720, capacity: -5 },
});
check('capacité négative -> 400', c3b.status === 400);

const c4 = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { date: DATE, startMinutes: 720, endMinutes: 750, capacity: 10 },
});
check('sans label -> 400', c4.status === 400);

// --- 5. bulk dates[] --------------------------------------------------------------
const bulk = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Série ' + RUN, dates: ['2027-06-16', '2027-06-17', '2027-06-18'], startMinutes: 660, endMinutes: 690, capacity: 30 },
});
check('dates[] -> 3 créés', bulk.status === 201 && bulk.data?.created === 3, JSON.stringify({ created: bulk.data?.created, skipped: bulk.data?.skipped }));
const bulk2 = await authed('POST', '/menus/slots', {
  as: 'admin',
  body: { label: 'Série ' + RUN, dates: ['2027-06-16', '2027-06-19'], startMinutes: 660, endMinutes: 690, capacity: 30 },
});
check('dates[] doublons ignorés', bulk2.status === 201 && bulk2.data?.created === 1 && bulk2.data?.skipped === 1, JSON.stringify(bulk2.data?.skipped));
await prisma.timeSlot.deleteMany({ where: { label: 'Série ' + RUN } });

// --- 6-8 : update / activate / deactivate -----------------------------------------
const u1 = await authed('PATCH', `/menus/slots/${slotId}`, {
  as: 'admin', body: { capacity: 80, label: 'Renommé ' + RUN },
});
check('modification capacité+label -> 200', u1.status === 200 && u1.data?.slot?.capacity === 80 && u1.data?.slot?.label?.startsWith('Renommé'));

const deact = await authed('POST', `/menus/slots/${slotId}/deactivate`, { as: 'admin' });
check('désactivation -> isOpen false', deact.status === 200 && deact.data?.slot?.isOpen === false && deact.data?.slot?.status === 'inactive');
const act = await authed('POST', `/menus/slots/${slotId}/activate`, { as: 'admin' });
check('activation -> isOpen true', act.status === 200 && act.data?.slot?.isOpen === true);

// --- 9. réservation sur créneau désactivé -> refus ----------------------------------
const rsDeact = await prisma.timeSlot.create({
  data: { label: 'Fermé ' + RUN, date: dateObj, startMinutes: 960, endMinutes: 990, capacity: 5, isOpen: false },
});
const rClosed = await authed('POST', '/reservations', {
  as: 'student', body: { menuItemId: menuItem.id, timeSlotId: rsDeact.id },
});
check('réserver créneau désactivé -> refus', [404, 409].includes(rClosed.status), JSON.stringify(rClosed.data?.error?.code));
await prisma.timeSlot.delete({ where: { id: rsDeact.id } });

// --- 10. capacité pleine -----------------------------------------------------------
const small = await prisma.timeSlot.create({
  data: { label: 'Plein ' + RUN, date: dateObj, startMinutes: 1020, endMinutes: 1050, capacity: 1 },
});
const r1 = await authed('POST', '/reservations', {
  as: 'student', body: { menuItemId: menuItem.id, timeSlotId: small.id },
});
check('1re réservation -> 201', r1.status === 201, JSON.stringify(r1.data?.error?.code));

// autre élève pour la 2e (maxPerStudent=1 bloquerait sinon)
const bob = await prisma.user.create({
  data: {
    email: `bob-${RUN}@exemple.ci`, passwordHash: aya.user.passwordHash, role: 'STUDENT',
    firstName: 'Bob', lastName: 'Test', phone: '+2250700000099', emailVerifiedAt: new Date(),
    studentProfile: { create: { kind: 'STUDENT', matricule: `VAT-T-${RUN}`, level: 'Lycée', grade: 'Seconde', wallet: { create: { balance: 100000 } } } },
  },
  include: { studentProfile: true },
});
await loginFull(`bob-${RUN}@exemple.ci`, 'student2');

const r2 = await authed('POST', '/reservations', {
  as: 'student2', body: { menuItemId: menuItem.id, timeSlotId: small.id },
});
check('créneau plein -> 409 SLOT_FULL', r2.status === 409 && r2.data?.error?.code === 'SLOT_FULL', JSON.stringify(r2.data));

// --- 11. suppression créneau utilisé -> 409 -----------------------------------------
const del = await authed('DELETE', `/menus/slots/${small.id}`, { as: 'admin' });
check('supprimer créneau utilisé -> 409', del.status === 409 && del.data?.error?.code === 'SLOT_HAS_RESERVATIONS', JSON.stringify(del.data?.error?.message));

// --- 12. réduction capacité sous les réservations ------------------------------------
const u2 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { capacity: 1 }, // reservedCount = 1 -> égal, autorisé
});
check('capacité = réservations -> OK', u2.status === 200);

const u3 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { capacity: 1, force: false, label: 'X' },
});
// capacité 1 = reservedCount 1 — pas de conflit ; testons sous la barre via fixture
await prisma.timeSlot.update({ where: { id: small.id }, data: { reservedCount: 2 } });
const u4 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { capacity: 1 },
});
check('capacité < réservations -> 409', u4.status === 409 && u4.data?.error?.code === 'CAPACITY_BELOW_RESERVED', JSON.stringify(u4.data?.error?.details));
const u5 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { capacity: 1, force: true },
});
check('même baisse + force -> 200', u5.status === 200);

// --- 13. horaires modifiés sur créneau utilisé ---------------------------------------
const u6 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { startMinutes: 1030 },
});
check('horaires sur créneau utilisé -> 409', u6.status === 409 && u6.data?.error?.code === 'SLOT_HAS_RESERVATIONS');
const u7 = await authed('PATCH', `/menus/slots/${small.id}`, {
  as: 'admin', body: { startMinutes: 1030, force: true },
});
check('horaires + force -> 200', u7.status === 200);
// rétablir pour la suite
await prisma.timeSlot.update({ where: { id: small.id }, data: { startMinutes: 1020, reservedCount: 1 } });

// --- 14. concurrence : 5 demandes pour la dernière place ------------------------------
const race = await prisma.timeSlot.create({
  data: { label: 'Race ' + RUN, date: dateObj, startMinutes: 1080, endMinutes: 1110, capacity: 1 },
});
// 5 élèves supplémentaires
const students = [];
for (let i = 0; i < 5; i++) {
  const u = await prisma.user.create({
    data: {
      email: `r${i}-${RUN}@exemple.ci`, passwordHash: aya.user.passwordHash, role: 'STUDENT',
      firstName: 'R', lastName: `${i}`, phone: `+2250710000${i}`, emailVerifiedAt: new Date(),
      studentProfile: { create: { kind: 'STUDENT', matricule: `VAT-R${i}-${RUN}`, level: 'Lycée', grade: 'Première', wallet: { create: { balance: 100000 } } } },
    },
  });
  await loginFull(`r${i}-${RUN}@exemple.ci`, `rs${i}`);
  students.push(`rs${i}`);
}
const results = await Promise.all(students.map((s) =>
  authed('POST', '/reservations', { as: s, body: { menuItemId: menuItem.id, timeSlotId: race.id } })
    .then((r) => r.status),
));
const wins = results.filter((s) => s === 201).length;
const full = results.filter((s) => s === 409).length;
check('1 seule réservation gagne la dernière place', wins === 1 && full === 4, JSON.stringify(results));
const raceAfter = await prisma.timeSlot.findUnique({ where: { id: race.id } });
check('reservedCount = 1 (pas de dépassement)', raceAfter.reservedCount === 1, `reservedCount=${raceAfter.reservedCount}`);

// --- 15. accès non admin -------------------------------------------------------------
const forbidden = await authed('POST', '/menus/slots', {
  as: 'student', body: { label: 'X', date: DATE, startMinutes: 600, endMinutes: 630, capacity: 10 },
});
check('création par élève -> 403', forbidden.status === 403);
const forbidden2 = await authed('PATCH', `/menus/slots/${slotId}`, { as: 'student', body: { capacity: 1 } });
check('modification par élève -> 403', forbidden2.status === 403);

// --- 16. suppression créneau vide autorisée -------------------------------------------
const empty = await prisma.timeSlot.create({
  data: { label: 'Vide ' + RUN, date: dateObj, startMinutes: 1140, endMinutes: 1170, capacity: 5 },
});
const delOk = await authed('DELETE', `/menus/slots/${empty.id}`, { as: 'admin' });
check('supprimer créneau vide -> 204', delOk.status === 204);

// --- 17. GET /:id scoped ---------------------------------------------------------------
const g1 = await authed('GET', `/menus/slots/${slotId}`, { as: 'student' });
check('élève lit créneau actif', g1.status === 200 && g1.data?.slot?.remaining !== undefined);
const closed = await prisma.timeSlot.create({
  data: { label: 'Caché ' + RUN, date: dateObj, startMinutes: 1200, endMinutes: 1230, capacity: 5, isOpen: false },
});
const g2 = await authed('GET', `/menus/slots/${closed.id}`, { as: 'student' });
check('élève ne voit pas créneau fermé -> 404', g2.status === 404);
await prisma.timeSlot.delete({ where: { id: closed.id } });

// --- cleanup --------------------------------------------------------------------------
await prisma.transaction.deleteMany({ where: { reservation: { timeSlotId: { in: [small.id, race.id] } } } });
await prisma.reservation.deleteMany({ where: { timeSlotId: { in: [small.id, race.id] } } });
await prisma.timeSlot.deleteMany({ where: { id: { in: [slotId, small.id, race.id] } } });
await prisma.menuItem.delete({ where: { id: menuItem.id } });
await prisma.dish.delete({ where: { id: dish.id } });
const testProfiles = await prisma.studentProfile.findMany({ where: { matricule: { contains: `-${RUN}` } }, select: { id: true } });
await prisma.wallet.deleteMany({ where: { studentId: { in: testProfiles.map((p) => p.id) } } });
await prisma.studentProfile.deleteMany({ where: { id: { in: testProfiles.map((p) => p.id) } } });
await prisma.user.deleteMany({ where: { email: { contains: RUN } } });

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} échec(s).`);
await prisma.$disconnect();
process.exit(failures ? 1 : 0);
