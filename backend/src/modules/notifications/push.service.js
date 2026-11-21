import { createRequire } from 'node:module';
// web-push est CommonJS : createRequire évite les soucis d'interop ESM.
const require = createRequire(import.meta.url);
const webpush = require('web-push');
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';

// ---------------------------------------------------------------------------
// Web Push (spec notifications) — VAPID, multi-appareils par utilisateur.
// Sans clés configurées : push ignoré silencieusement, mais la notification
// reste enregistrée dans l'historique IN_APP (dégradation gracieuse, même
// convention que GOOGLE_CLIENT_ID / Jeko).
// La clé privée ne quitte JAMAIS le serveur.
// ---------------------------------------------------------------------------

let configured = false;
if (env.vapidPublicKey && env.vapidPrivateKey) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
}

// Firebase Cloud Messaging (Admin SDK) : compte de service en base64 dans
// FIREBASE_SERVICE_ACCOUNT_BASE64. Absent ou invalide -> FCM désactivé.
let messaging = null;
if (env.firebaseServiceAccountBase64) {
  try {
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');
    const sa = JSON.parse(Buffer.from(env.firebaseServiceAccountBase64, 'base64').toString('utf8'));
    messaging = getMessaging(initializeApp({ credential: cert(sa) }, 'vatel-fcm'));
  } catch (err) {
    console.error('[push] configuration Firebase invalide :', err.message);
  }
}

export const isPushConfigured = () => configured || Boolean(messaging);
export const isFcmConfigured = () => Boolean(messaging);

export const registerFcmToken = async (userId, { token, userAgent }) => {
  const row = await prisma.fcmToken.upsert({
    where: { token },
    create: { userId, token, userAgent },
    update: { userId, userAgent, disabledAt: null },
  });
  return { token: { id: row.id } };
};

export const unregisterFcmToken = async (userId, { token }) => {
  await prisma.fcmToken.updateMany({
    where: { token, userId },
    data: { disabledAt: new Date() },
  });
};

const FCM_DEAD_TOKEN = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// Message data-only : le service worker affiche la notification lui-même.
const sendFcm = async (userId, payload) => {
  if (!messaging) return { sent: 0, disabled: 0 };
  const rows = await prisma.fcmToken.findMany({ where: { userId, disabledAt: null } });
  if (!rows.length) return { sent: 0, disabled: 0 };
  const data = Object.fromEntries(
    Object.entries(payload ?? {})
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const res = await messaging.sendEachForMulticast({
    tokens: rows.map((r) => r.token),
    data,
    webpush: { headers: { TTL: '3600', Urgency: 'high' } },
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    if (FCM_DEAD_TOKEN.has(r.error?.code)) dead.push(rows[i].id);
    else console.error(`[push] échec FCM ${rows[i].id}:`, r.error?.code ?? r.error?.message);
  });
  if (dead.length) {
    await prisma.fcmToken.updateMany({ where: { id: { in: dead } }, data: { disabledAt: new Date() } });
  }
  return { sent: res.successCount, disabled: dead.length };
};

// Enregistrement d'un appareil : upsert par endpoint (multi-appareils §4).
// L'endpoint appartient au navigateur : si un autre compte le présente, il
// est réattribué à l'utilisateur connecté (changement de session, famille).
export const subscribe = async (userId, { endpoint, keys, userAgent }) => {
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent, disabledAt: null },
  });
  return { subscription: { id: sub.id, endpoint: sub.endpoint } };
};

export const unsubscribe = async (userId, { endpoint }) => {
  // Seul le propriétaire peut se désabonner (anti-sabotage d'un appareil tiers).
  await prisma.pushSubscription.updateMany({
    where: { endpoint, userId },
    data: { disabledAt: new Date() },
  });
};

// Envoi à tous les appareils actifs de l'utilisateur. Best-effort : un échec
// réseau ne doit JAMAIS casser le flux métier appelant (spec §9, §13).
export const sendToUser = async (userId, payload) => {
  const fcm = await sendFcm(userId, payload).catch((err) => {
    console.error('[push] échec FCM:', err?.message);
    return { sent: 0, disabled: 0 };
  });
  if (!configured) return fcm;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId, disabledAt: null },
  });
  const body = JSON.stringify(payload);
  let sent = 0;
  const toDisable = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 3600 },
      );
      sent += 1;
    } catch (err) {
      // 404/410 = abonnement expiré côté navigateur : désactivation douce (§4).
      if (err?.statusCode === 404 || err?.statusCode === 410) toDisable.push(sub.id);
      else console.error(`[push] échec envoi ${sub.id}:`, err?.statusCode ?? err?.message);
    }
  }
  if (toDisable.length) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: toDisable } },
      data: { disabledAt: new Date() },
    });
  }
  return { sent: sent + fcm.sent, disabled: toDisable.length + fcm.disabled };
};

export const requirePushConfigured = () => {
  if (!configured) {
    throw new ApiError(503, 'PUSH_NOT_CONFIGURED', 'Notifications push non configurées côté serveur');
  }
};

export const requireFcmConfigured = () => {
  if (!messaging) {
    throw new ApiError(503, 'PUSH_NOT_CONFIGURED', 'Notifications push Firebase non configurées côté serveur');
  }
};
