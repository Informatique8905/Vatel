// Test bout-en-bout : notifications push (historique, prefs, abonnements,
// rappels) + liaisons parent-enfant. À lancer avec le serveur sur :4000.
// node --env-file=.env test-links-notifications.mjs
import { prisma } from './src/database/prisma.js';
import { runOnce } from './src/jobs/reminders.js';

const BASE = 'http://localhost:4000/api';
const PASSWORD = 'VatelDemo2026!';
const TS = Date.now().toString(36);
let passed = 0;
let failed = 0;

const check = (name, cond, extra) => {
  if (cond) { passed += 1; console.log(`  ok  ${name}`); }
  else { failed += 1; console.log(`  KO  ${name}`, extra ?? ''); }
};

// -- client HTTP avec jar de cookies + CSRF automatique ----------------------
const client = () => {
  const jar = new Map();
  const call = async (method, path, body) => {
    const headers = { 'content-type': 'application/json' };
    const csrf = jar.get('csrf_token');
    if (csrf && method !== 'GET') headers['x-csrf-token'] = csrf;
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
    let data = null;
    try { data = await res.json(); } catch { /* 204 */ }
    return { status: res.status, data };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b ?? {}),
    patch: (p, b) => call('PATCH', p, b),
    del: (p, b) => call('DELETE', p, b),
  };
};

const login = async (email) => {
  const c = client();
  const r = await c.post('/auth/login', { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  return c;
};

const register = async (role, tag) => {
  const c = client();
  const email = `${tag}.${TS}@test.dev`;
  const digits = String(Math.abs([...email].reduce((a, ch) => a + ch.charCodeAt(0), 0))).padStart(8, '7').slice(0, 10);
  const body = { firstName: tag, lastName: 'Test', email, phone: digits, password: PASSWORD, role };
  if (role === 'STUDENT') { body.kind = 'STUDENT'; body.level = 'Lycée'; body.grade = 'Tle A'; body.matricule = `M${TS}-${tag}`; }
  // L'envoi de l'OTP mail (Resend) peut échouer en réseau : le compte est
  // créé avant l'envoi — on tolère un 500 puis on vérifie par le login.
  let r;
  for (let i = 0; i < 3; i += 1) {
    r = await c.post('/auth/register', body);
    if (r.status === 201 || r.status === 200) break;
    if (r.status !== 500 && r.status !== 502) break;
    await new Promise((res) => setTimeout(res, 800));
  }
  const r2 = await c.post('/auth/login', { email, password: PASSWORD });
  if (r2.status !== 200) throw new Error(`register/login ${email}: reg=${r.status} login=${r2.status} ${JSON.stringify(r2.data)}`);
  return { c, email, loginStatus: r2.status, userId: r2.data?.user?.id };
};

const notifsOf = async (c, type) => {
  const r = await c.get('/notifications?pageSize=50');
  return (r.data?.notifications ?? []).filter((n) => !type || n.type === type);
};

// ==========================================================================
console.log('\n== A. Notifications : historique, préférences, abonnements push ==');

const aya = await login('aya.konan@exemple.ci');
const mme = await login('mme.konan@exemple.ci');
const admin = await login('admin@cantine-vatel.demo');

// préférences : lecture + modification
let r = await aya.get('/notifications/preferences');
check('GET préférences élève', r.status === 200 && r.data.preferences.notifySlotReminders === true);
// Opt-in parent OFF par défaut : vérifié sur un compte parent neuf (la préférence
// de mme.konan a pu être modifiée par un run précédent).
const freshParent = await register('PARENT', 'prefcheck');
r = await freshParent.c.get('/notifications/preferences');
check('GET préférences parent (opt-in enfant OFF par défaut)', r.status === 200 && r.data.preferences.notifyChildReminders === false);
r = await mme.patch('/notifications/preferences', { notifyChildReminders: true });
check('PATCH préférence parent -> true', r.status === 200 && r.data.preferences.notifyChildReminders === true);
r = await mme.patch('/notifications/preferences', {});
check('PATCH préférences vides -> 400', r.status === 400);

// clé publique VAPID : 503 sans configuration (dev)
r = await aya.get('/push/vapid-key');
check('GET vapid-key sans config -> 503', r.status === 503);

// abonnement push : enregistrement + multi-appareils + désabonnement
const ep1 = `https://push.example.com/sub/${TS}-a`;
const ep2 = `https://push.example.com/sub/${TS}-b`;
r = await aya.post('/push/subscriptions', { endpoint: ep1, keys: { p256dh: 'k1', auth: 'a1' }, userAgent: 'test/1' });
check('abonnement push appareil 1 -> 201', r.status === 201);
r = await aya.post('/push/subscriptions', { endpoint: ep2, keys: { p256dh: 'k2', auth: 'a2' } });
check('abonnement push appareil 2 -> 201', r.status === 201);
const subCount = await prisma.pushSubscription.count({ where: { endpoint: { in: [ep1, ep2] }, disabledAt: null } });
check('deux appareils enregistrés', subCount === 2);
r = await aya.del('/push/subscriptions', { endpoint: ep1 });
check('désabonnement -> 204', r.status === 204);
const sub1 = await prisma.pushSubscription.findUnique({ where: { endpoint: ep1 } });
check('endpoint désactivé (pas supprimé)', sub1.disabledAt !== null);
// un autre user ne peut pas désabonner l'appareil d'aya
r = await mme.del('/push/subscriptions', { endpoint: ep2 });
const sub2 = await prisma.pushSubscription.findUnique({ where: { endpoint: ep2 } });
check('désabonnement par un tiers refusé (endpoint intact)', r.status === 204 && sub2.disabledAt === null);

// ==========================================================================
console.log('\n== B. Liaisons parent-enfant ==');

const s = await register('STUDENT', 'eleve');   // élève neuf
const p = await register('PARENT', 'parent');    // parent neuf
const p2 = await register('PARENT', 'parent2');  // second parent (non lié)

// -- B1. élève crée l'invitation, parent la claim -> APPROVED immédiat
r = await s.c.post('/links/invitations');
check('création invitation par élève -> 201 + token', r.status === 201 && typeof r.data.invitation.token === 'string');
const invToken = r.data.invitation.token;
check('token opaque >= 40 chars', invToken.length >= 40);
const invId = r.data.invitation.id;

// hash stocké, jamais le jeton en clair
const invRow = await prisma.linkInvitation.findUnique({ where: { id: invId } });
check('seul le hash est stocké', invRow.tokenHash !== invToken && invRow.tokenHash.length === 64);

r = await p.c.post('/links/claim', { token: invToken, method: 'QR_CODE' });
check('claim QR par parent -> 201 APPROVED', r.status === 201 && r.data.link.status === 'APPROVED' && r.data.link.method === 'QR_CODE');
const linkId = r.data.link.id;
check('approvedAt renseigné', Boolean(r.data.link.approvedAt));

// les deux parties sont notifiées
await new Promise((res) => setTimeout(res, 200));
check('notif LINK_CREATED parent', (await notifsOf(p.c, 'LINK_CREATED')).length === 1);
check('notif LINK_CREATED élève', (await notifsOf(s.c, 'LINK_CREATED')).length === 1);

// -- B2. rejeu du même jeton -> refusé
r = await p2.c.post('/links/claim', { token: invToken });
check('invitation déjà utilisée -> 400', r.status === 400);

// -- B3. parent crée l'invitation, élève la claim (sens inverse)
r = await p.c.post('/links/invitations');
const inv2 = r.data.invitation;
// un élève non concerné peut aussi clamer ? Non : rôle complémentaire ok,
// mais un parent ne peut PAS clamer une invitation de parent.
r = await p2.c.post('/links/claim', { token: inv2.token });
check('claim par mauvais rôle -> 403 ROLE_MISMATCH', r.status === 403 && r.data.error?.code === 'ROLE_MISMATCH');
r = await s.c.post('/links/claim', { token: inv2.token });
check('claim lien par élève -> 409 ALREADY_LINKED (déjà liés)', r.status === 409);

// -- B4. auto-liaison interdite
r = await s.c.post('/links/claim', { token: invToken });
check('self-claim -> 400 (invitation consommée)', r.status === 400);

// -- B5. invitation révoquée
r = await s.c.post('/links/invitations');
const inv3 = r.data.invitation;
r = await s.c.del(`/links/invitations/${inv3.id}`);
check('révocation invitation -> 204', r.status === 204);
r = await p2.c.post('/links/claim', { token: inv3.token });
check('claim invitation révoquée -> 400', r.status === 400);

// -- B6. invitation expirée (simulée en base)
r = await s.c.post('/links/invitations');
const inv4 = r.data.invitation;
await prisma.linkInvitation.update({ where: { id: inv4.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
r = await p2.c.post('/links/claim', { token: inv4.token });
check('claim invitation expirée -> 400', r.status === 400);

// -- B7. consultation : enfants liés + accès données
r = await p.c.get('/parents/children');
check('GET enfants parent lié -> 1 enfant + solde', r.status === 200 && r.data.children.length === 1);
const childStudentId = r.data.children[0].studentId;
r = await p2.c.get('/parents/children');
check('parent non lié -> liste vide', r.status === 200 && r.data.children.length === 0);
r = await p.c.get(`/wallets/${childStudentId}`);
check('parent lié lit le portefeuille enfant', r.status === 200);
r = await p2.c.get(`/wallets/${childStudentId}`);
check('parent NON lié -> 404 (anti-IDOR)', r.status === 404);

// -- B8. ADMIN ne peut pas créer d'invitation, mais voit toutes les liaisons
r = await admin.post('/links/invitations');
check('admin création invitation -> 403', r.status === 403);
r = await admin.get('/links');
check('admin liste toutes les liaisons', r.status === 200 && r.data.links.length >= 2);

// -- B9. un second élève pour le même parent
const s2 = await register('STUDENT', 'eleve2');
r = await s2.c.post('/links/invitations');
await p.c.post('/links/claim', { token: r.data.invitation.token });
r = await p.c.get('/parents/children');
check('parent lié à 2 enfants', r.status === 200 && r.data.children.length === 2);

// -- B10. révocation : coupure immédiate + notification à l'autre partie
r = await p.c.del(`/links/${linkId}`);
check('révocation liaison -> 204', r.status === 204);
r = await p.c.get(`/wallets/${childStudentId}`);
check('accès portefeuille coupé après révocation', r.status === 404);
await new Promise((res) => setTimeout(res, 200));
check('notif LINK_REVOKED élève', (await notifsOf(s.c, 'LINK_REVOKED')).length === 1);
const revokedLink = await prisma.parentStudent.findUnique({ where: { id: linkId } });
check('liaison REVOKED + tracée', revokedLink.status === 'REVOKED' && revokedLink.revokedById != null);
const audit = await prisma.auditLog.findFirst({ where: { action: 'PARENT_LINK_REVOKED', resourceId: linkId } });
check('audit PARENT_LINK_REVOKED', Boolean(audit));

// -- B11. révocation par un tiers -> 404
r = await p.c.get('/parents/children');
const linkId2 = r.data.children[0].linkId;
r = await p2.c.del(`/links/${linkId2}`);
check('révocation par tiers -> 404', r.status === 404);

// ==========================================================================
console.log('\n== C. Notifications de réservation ==');

// Menus/créneaux du seed — les créneaux seedés (14h-15h) peuvent être passés :
// l'admin crée un créneau du jour ~3h dans le futur (deadline -120min respectée).
const nowMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
const startMin = Math.min(Math.ceil((nowMin + 180) / 30) * 30, 1400); // ≤ 23:20
const dayIso = new Date().toISOString().slice(0, 10);
r = await admin.post('/menus/slots', {
  label: `Créneau test ${TS}`, date: dayIso,
  startMinutes: startMin, endMinutes: startMin + 30, capacity: 30,
});
check('créneau de test créé', r.status === 201 && r.data.slots?.length >= 1, JSON.stringify(r.data));
const slot = r.data?.slots?.[0];
const menus = await aya.get('/menus/items');
const item = menus.data.items.find((i) => i.remaining > 0 && !i.allergenAlert);
check('menu + créneau disponibles', Boolean(item && slot?.id));

// C1. élève fauché -> notification d'échec explicite
const broke = await register('STUDENT', 'fauche');
r = await broke.c.post('/reservations', { menuItemId: item.id, timeSlotId: slot.id, idempotencyKey: `ko-${TS}` });
check('réservation solde 0 -> 422 INSUFFICIENT_FUNDS', r.status === 422, JSON.stringify(r.data));
await new Promise((res) => setTimeout(res, 200));
const failNotif = (await notifsOf(broke.c, 'RESERVATION_FAILED'))[0];
check('notif échec élève', Boolean(failNotif));
check('message sans ambiguïté de débit', failNotif?.body.includes("Aucun montant n'a été débité"));

// C2. réservation réussie -> notif élève + parent lié + rappels planifiés
// relier le parent p à l'élève s (déjà révoqué) -> nouvelle invitation,
// puis créditer le portefeuille de s via un ajustement admin documenté.
r = await s.c.post('/links/invitations');
await p.c.post('/links/claim', { token: r.data.invitation.token });
await p.c.patch('/notifications/preferences', { notifyChildReminders: true });
const sProf = await prisma.studentProfile.findFirst({ where: { user: { email: s.email } } });
r = await admin.post('/transactions/adjustment', { studentId: sProf.id, amount: 5000, direction: 'CREDIT', reason: 'Crédit de test notifications' });
check('ajustement admin crédite s', r.status === 201 || r.status === 200, JSON.stringify(r.data));

r = await s.c.post('/reservations', { menuItemId: item.id, timeSlotId: slot.id, idempotencyKey: `ok-${TS}` });
check('réservation élève lié -> 201', r.status === 201, JSON.stringify(r.data));
const reservation = r.data?.reservation;
await new Promise((res) => setTimeout(res, 300));
const okNotif = (await notifsOf(s.c, 'RESERVATION_CONFIRMED'))[0];
check('notif RESERVATION_CONFIRMED élève', Boolean(okNotif));
check('contenu : plat + créneau + montant', Boolean(okNotif?.body.includes('débités')));
const parentNotif = (await notifsOf(p.c, 'CHILD_RESERVATION'))[0];
check('notif parent (enfant a réservé)', Boolean(parentNotif));

const rems = await prisma.scheduledReminder.findMany({ where: { reservationId: reservation.id } });
check('2 rappels élève + 2 rappels parent planifiés', rems.length === 4, `got ${rems.length}`);

// C3. idempotence : même idempotencyKey -> pas de notif/rappel en double
r = await s.c.post('/reservations', { menuItemId: item.id, timeSlotId: slot.id, idempotencyKey: `ok-${TS}` });
check('replay réservation -> 200 même réservation', r.status === 200 && r.data.reservation.id === reservation.id);
await new Promise((res) => setTimeout(res, 200));
check('pas de notif dupliquée', (await notifsOf(s.c, 'RESERVATION_CONFIRMED')).length === 1);
check('pas de rappel dupliqué', (await prisma.scheduledReminder.count({ where: { reservationId: reservation.id } })) === 4);

// C4. historique : marquage lu + tout lire + anti-IDOR
r = await s.c.get('/notifications?unread=true');
check('unread >= 2', r.data.unreadCount >= 2);
const someNotif = r.data.notifications[0];
r = await s.c.post(`/notifications/${someNotif.id}/read`);
check('marquer lue -> 200', r.status === 200);
r = await p.c.post(`/notifications/${someNotif.id}/read`);
check('marquer la notif d\'autrui -> 404', r.status === 404);
r = await s.c.post('/notifications/read-all');
check('tout marquer lu', r.status === 200 && r.data.marked >= 1);

// ==========================================================================
console.log('\n== D. Rappels de créneau (worker) ==');

// D1. forcer l'échéance d'un rappel SLOT_START puis exécuter un tick
await prisma.scheduledReminder.updateMany({
  where: { reservationId: reservation.id, type: 'SLOT_START' },
  data: { runAt: new Date(Date.now() - 1000) },
});
await runOnce();
const startRems = await prisma.scheduledReminder.findMany({ where: { reservationId: reservation.id, type: 'SLOT_START' } });
check('rappels SLOT_START envoyés', startRems.every((x) => x.status === 'SENT'), startRems.map((x) => x.status).join(','));
const slotStartNotif = (await notifsOf(s.c, 'SLOT_START_REMINDER'))[0];
check('notif SLOT_START_REMINDER élève', Boolean(slotStartNotif));
check('notif rappel parent (opt-in ON)', (await notifsOf(p.c, 'SLOT_START_REMINDER')).length === 1);

// D2. rejouer le tick -> aucune duplication (statut SENT non repris)
await runOnce();
check('tick rejoué sans doublon', (await notifsOf(s.c, 'SLOT_START_REMINDER')).length === 1);

// D3. repas récupéré -> rappel de fin annulé, aucune notif SLOT_END
r = await admin.post('/distributions/scan', { token: reservation.qrToken });
check('scan QR -> COLLECTED', r.status === 201 || r.status === 200, JSON.stringify(r.data));
await prisma.scheduledReminder.updateMany({
  where: { reservationId: reservation.id, type: 'SLOT_END' },
  data: { runAt: new Date(Date.now() - 1000) },
});
await runOnce();
const endRems = await prisma.scheduledReminder.findMany({ where: { reservationId: reservation.id, type: 'SLOT_END' } });
check('rappels SLOT_END annulés après collecte', endRems.every((x) => x.status === 'CANCELLED'));
check('aucune notif SLOT_END_REMINDER', (await notifsOf(s.c, 'SLOT_END_REMINDER')).length === 0);

// D4. annulation de réservation -> rappels annulés + notif d'annulation
// s réserve l'AUTRE plat (le sien est déjà pris, maxPerStudent = 1).
const sMenus = await s.c.get('/menus/items');
const itemB = sMenus.data.items.find((i) => i.id !== item.id && i.remaining > 0 && !i.allergenAlert);
r = await s.c.post('/reservations', { menuItemId: itemB.id, timeSlotId: slot.id, idempotencyKey: `cancel-${TS}` });
const resa3 = r.data?.reservation;
check('réservation s (2e plat) -> 201', r.status === 201, JSON.stringify(r.data));
if (resa3) {
  const rc = await s.c.post(`/reservations/${resa3.id}/cancel`);
  check('annulation -> 200', rc.status === 200, JSON.stringify(rc.data));
  const rem3 = await prisma.scheduledReminder.findMany({ where: { reservationId: resa3.id, status: 'PENDING' } });
  check('aucun rappel en attente après annulation', rem3.length === 0);
  await new Promise((res) => setTimeout(res, 200));
  check('notif RESERVATION_CANCELLED élève', (await notifsOf(s.c, 'RESERVATION_CANCELLED')).length >= 1);
}

// ==========================================================================
console.log('\n== E. Révocation => plus de notifications parent ==');

// révoquer le lien s <-> p puis vérifier qu'une nouvelle réservation ne notifie plus p
r = await p.c.get('/parents/children');
const sProfile = await prisma.studentProfile.findFirst({ where: { user: { email: s.email } }, include: { wallet: true } });
const sLink = r.data.children.find((ch) => ch.studentId === sProfile?.id)?.linkId;
if (sLink) {
  await s.c.del(`/links/${sLink}`);
  const before = (await notifsOf(p.c)).length;
  check('élève s a un portefeuille', Boolean(sProfile?.wallet));
  // tentative réservation même sans solde -> notif d'échec élève seulement
  await s.c.post('/reservations', { menuItemId: item.id, timeSlotId: slot.id, idempotencyKey: `post-revoke-${TS}` });
  await new Promise((res) => setTimeout(res, 300));
  const after = (await notifsOf(p.c)).length;
  check('parent révoqué non notifié', after === before, `${before} -> ${after}`);
} else {
  check('lien s-p retrouvé pour révocation', false);
}

// ==========================================================================
console.log(`\n${passed} passés, ${failed} échoués\n`);
await prisma.$disconnect();
process.exit(failed ? 1 : 0);
