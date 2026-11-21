import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Instance unique du client Prisma (pattern singleton).
export const prisma = new PrismaClient({
  log: env.isProd ? ['warn', 'error'] : ['warn', 'error'],
});
