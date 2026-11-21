import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import * as push from './push.service.js';

// ---------------------------------------------------------------------------
// Notifications (spec §13) — deux choses complémentaires :
//  1. la notification PERSISTÉE (historique IN_APP consultable, marquage "lu") ;
//  2. le push Web, best-effort et asynchrone : jamais dans la transaction
//     métier, jamais bloquant (l'envoi ne doit pas annuler une opération §13).
//
// Usage dans un flux métier :
//   const notifs = await notifyInTx(tx, [...]);       // rows créées dans la tx
//   ...commit...
//   deliver(notifs);                                 // push fire-and-forget
// ---------------------------------------------------------------------------

const publicNotification = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  payload: n.payload,
  read: Boolean(n.readAt),
  readAt: n.readAt,
  createdAt: n.createdAt,
});

// Crée les lignes Notification DANS la transaction métier `tx`.
// dedupeKey -> une notification par événement (P2002 = déjà émise, ignoré).
export const notifyInTx = async (tx, entries) => {
  const created = [];
  for (const e of entries) {
    if (e.dedupeKey) {
      const dup = await tx.notification.findUnique({ where: { dedupeKey: e.dedupeKey }, select: { id: true } });
      if (dup) continue;
    }
    created.push(
      await tx.notification.create({
        data: {
          userId: e.userId,
          type: e.type,
          title: e.title,
          body: e.body,
          payload: e.payload ?? undefined,
          dedupeKey: e.dedupeKey,
        },
      }),
    );
  }
  return created;
};

// Version hors transaction (ex. notifications d'échec, post-événement).
export const notify = async (entries) => notifyInTx(prisma, entries);

// Push post-commit : fire-and-forget, ne bloque ni ne fait échouer la réponse.
export const deliver = (notifications) => {
  for (const n of notifications) {
    push
      .sendToUser(n.userId, { title: n.title, body: n.body ?? '', ...(n.payload ?? {}) })
      .then(() =>
        prisma.notification.update({
          where: { id: n.id },
          data: { status: 'SENT', sentAt: new Date() },
        }),
      )
      .catch((err) => console.error(`[notify] push ${n.id}:`, err?.message));
  }
};

// --- Historique utilisateur ---

export const list = async (user, { page, pageSize, unreadOnly }) => {
  const where = { userId: user.id, ...(unreadOnly && { readAt: null }) };
  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    notifications: notifications.map(publicNotification),
    unreadCount,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const markRead = async (user, id) => {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null }, // portée utilisateur (anti-IDOR)
    data: { readAt: new Date() },
  });
  if (count === 0) throw new ApiError(404, 'NOT_FOUND', 'Notification introuvable');
};

export const markAllRead = async (user) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { marked: count };
};

// --- Préférences ---
export const getPreferences = (user) => ({
  preferences: {
    notifySlotReminders: user.notifySlotReminders,
    notifyChildReminders: user.notifyChildReminders,
  },
});

export const updatePreferences = async (user, prefs) => {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: prefs,
    select: { notifySlotReminders: true, notifyChildReminders: true },
  });
  return { preferences: updated };
};
