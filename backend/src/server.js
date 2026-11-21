import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { ensureAdminAccount } from './bootstrap/ensureAdmin.js';
import { ensureReferenceData } from './bootstrap/ensureReferenceData.js';
import { startReminderWorker, stopReminderWorker } from './jobs/reminders.js';

// Le compte admin est initialisé AVANT d'accepter des requêtes (spec §12.2) ;
// un échec en production empêche le démarrage.
await ensureAdminAccount();
await ensureReferenceData();

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`API Cantine Vatel démarrée sur http://localhost:${env.port} (${env.nodeEnv})`);
});

// Worker de rappels persisté (PostgreSQL) : rappels créneau §2.E/F.
startReminderWorker();

// Arrêt propre : fermeture HTTP puis déconnexion Prisma (Railway envoie SIGTERM)
const shutdown = async (signal) => {
  console.log(`${signal} reçu, arrêt en cours…`);
  stopReminderWorker();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
