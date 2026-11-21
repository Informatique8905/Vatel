import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`API Cantine Vatel démarrée sur http://localhost:${env.port} (${env.nodeEnv})`);
});

// Arrêt propre : fermeture HTTP puis déconnexion Prisma (Railway envoie SIGTERM)
const shutdown = async (signal) => {
  console.log(`${signal} reçu, arrêt en cours…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
