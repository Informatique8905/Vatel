import { createRequire } from 'node:module';
// web-push est CommonJS : createRequire évite les soucis d'interop ESM.
const webpush = createRequire(import.meta.url)('web-push');
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

export const isPushConfigured = () => configured;

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
  if (!configured) return { sent: 0, disabled: 0 };
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
  return { sent, disabled: toDisable.length };
};

export const requirePushConfigured = () => {
  if (!configured) {
    throw new ApiError(503, 'PUSH_NOT_CONFIGURED', 'Notifications push non configurées côté serveur');
  }
};
