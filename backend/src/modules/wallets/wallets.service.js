import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { businessRules } from '../../config/businessRules.js';

// Lecture des soldes — jamais d'écriture ici : toute variation passe par le
// ledger (spec §8.5). Portées par rôle, deny by default (§12.2) ; l'accès à un
// portefeuille hors portée renvoie NOT_FOUND (anti-IDOR, §12.3).

const publicWallet = (w) => ({
  studentId: w.studentId,
  balance: w.balance,
  currency: w.currency,
  // Seuil "solde faible" : règle À CONFIRMER isolée en config (§19).
  lowBalance: w.balance < businessRules.lowBalanceThresholdXof,
  updatedAt: w.updatedAt,
});

// Un élève/employé a toujours un portefeuille (créé à l'inscription) ;
// l'upsert couvre les comptes historiques ou créés hors flux normal.
export const getMyWallet = async (user) => {
  const studentId = user.studentProfile?.id;
  if (!studentId) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');
  const wallet = await prisma.wallet.upsert({
    where: { studentId },
    create: { studentId },
    update: {},
  });
  return { wallet: publicWallet(wallet) };
};

// PARENT : portefeuille d'un enfant lié APPROVED uniquement (§3.2).
// ADMIN : n'importe quel portefeuille.
export const getWalletForStudent = async (user, studentId) => {
  if (user.role === 'PARENT') {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: user.id, studentId } },
      select: { status: true },
    });
    if (link?.status !== 'APPROVED') {
      throw new ApiError(404, 'NOT_FOUND', 'Élève introuvable');
    }
  }
  const wallet = await prisma.wallet.findUnique({ where: { studentId } });
  if (!wallet) throw new ApiError(404, 'NOT_FOUND', 'Portefeuille introuvable');
  return { wallet: publicWallet(wallet) };
};

// Vue financière admin : solde des recettes cantine + passif élèves
// (somme des portefeuilles = repas encore dus aux élèves, §8.1).
export const getCanteenSummary = async () => {
  const canteen = await prisma.canteenAccount.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  const agg = await prisma.wallet.aggregate({
    _sum: { balance: true },
    _count: { _all: true },
  });
  return {
    canteen: { balance: canteen.balance, currency: canteen.currency },
    studentWallets: {
      count: agg._count._all,
      totalBalance: agg._sum.balance ?? 0,
      currency: canteen.currency,
    },
  };
};
