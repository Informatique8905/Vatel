import argon2 from 'argon2';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';

// ---------------------------------------------------------------------------
// Compte administrateur initial (spec §12.2 — jamais via l'inscription publique).
// Appelé au démarrage AVANT que le serveur accepte des requêtes.
// - Idempotent : ADMIN_USERNAME (e-mail) est unique ; un second démarrage ou
//   deux instances concurrentes ne créent jamais de doublon.
// - Le mot de passe n'est JAMAIS réécrit sur un admin existant : les rotations
//   suivent une procédure dédiée, pas un redéploiement.
// - Jamais de log du mot de passe.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ensureAdminAccount = async () => {
  const username = env.adminUsername.trim();
  const password = env.adminPassword;

  if (!username || !password) {
    if (env.isProd) {
      // En production : pas de démarrage sans admin initialisé (fail-fast).
      throw new Error(
        'ADMIN_USERNAME et ADMIN_PASSWORD sont requis en production — démarrage refusé',
      );
    }
    console.warn('[bootstrap] ADMIN_USERNAME/ADMIN_PASSWORD absents — création admin ignorée (dev)');
    return { created: false, reason: 'env-missing' };
  }

  // Le login passe par le champ email : ADMIN_USERNAME doit être un e-mail valide.
  if (!EMAIL_RE.test(username)) {
    throw new Error('ADMIN_USERNAME doit être une adresse e-mail valide (champ de connexion)');
  }

  const email = username.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      // Ne jamais élever silencieusement un compte existant vers ADMIN.
      throw new Error(
        `ADMIN_USERNAME (${email}) correspond à un compte ${existing.role} existant — conflit refusé`,
      );
    }
    return { created: false, reason: 'exists' };
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'Cantine',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(), // compte interne : pas de parcours OTP
      },
    });
    console.log(`[bootstrap] Compte administrateur créé (${email})`);
    return { created: true };
  } catch (err) {
    if (err?.code === 'P2002') {
      // Deux instances ont démarré en parallèle : l'autre a créé le compte.
      return { created: false, reason: 'race' };
    }
    throw err;
  }
};
