// Test de bout en bout du module financier SANS clés Jeko réelles :
// - topup -> 503 attendu (JEKO_NOT_CONFIGURED), intent marqué FAILED
// - webhook signé à la main -> crédit wallet ; rejeu -> ignoré ; mauvaise sig -> 401
// - retrait admin -> échec Jeko -> fonds réservés libérés (REVERSAL)
// Usage : node --env-file=.env scripts/test-financial.mjs
import crypto from 'node:crypto';
import { prisma } from '../src/database/prisma.js';

const RUN = Date.now().toString(36);
const TOP_REF = 'TOP-SMK-' + RUN;
const PR_REF = 'pr_smk_' + RUN;
const TXN_REF = 'txn_smk_' + RUN;
const API = 'http://localhost:4000/api';
const SECRET = process.env.JEKO_WEBHOOK_SECRET;
const jar = {};
let failures = 0;

const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  OK ' : ' FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const req = async (method, path, { body, as, raw, headers = {} } = {}) => {
  const h = { ...headers };
  if (as && jar[as]) h.Cookie = jar[as];
  if (body && !raw) h['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers: h,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && as) {
    jar[as] = (jar[as] ? jar[as] + '; ' : '') + setCookie.split(';')[0];
  }
  let data = null;
  try { data = await res.json(); } catch { /* vide */ }
  return { status: res.status, data };
};

const csrf = async (who) => {
  const r = await req('GET', '/health', { as: who });
  const m = /csrf_token=([^;]+)/.exec(jar[who] ?? '');
  if (!m) {
    // le middleware émet un token signé — le relire depuis le cookie complet
  }
  return decodeURIComponent(m?.[1] ?? '');
};

const login = async (email, who) => {
  const r = await req('POST', '/auth/login', {
    body: { email, password: 'VatelDemo2026!' },
    headers: { 'x-csrf-token': await csrf(who) },
  });
  jar[who] += '; ' + r.headers?.get?.('set-cookie') ?? '';
  // relire tous les cookies émis
  return r;
};

const sign = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('hex');

const webhook = async (payload, { badSig = false } = {}) => {
  const raw = JSON.stringify(payload);
  return req('POST', '/webhooks/jeko', {
    raw: true,
    body: raw,
    headers: {
      'Content-Type': 'application/json',
      'Jeko-Event': 'TRANSACTION_COMPLETED',
      'Jeko-Signature': badSig ? 'deadbeef' + '0'.repeat(56) : sign(raw),
    },
  });
};

// --- setup -----------------------------------------------------------------
const aya = await prisma.studentProfile.findFirst({ include: { wallet: true, user: true } });
const parentUser = await prisma.user.findUnique({ where: { email: 'mme.konan@exemple.ci' } });
console.log(`élève: ${aya.user.email} wallet=${aya.wallet.balance} F`);

// CSRF : le middleware lit x-csrf-token + cookie signé. Récupérer le token via
// n'importe quelle réponse (le cookie csrf est posé automatiquement).
const loginFull = async (email, who) => {
  await req('GET', '/health', { as: who });
  const cookie = jar[who];
  const token = decodeURIComponent(/csrf_token=([^;]+)/.exec(cookie)?.[1] ?? '');
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': token },
    body: JSON.stringify({ email, password: 'VatelDemo2026!' }),
  });
  const sc = r.headers.get('set-cookie') ?? '';
  jar[who] = [cookie, ...sc.split(/,(?=\s*\w+=)/).map((c) => c.split(';')[0])].join('; ');
  const token2 = decodeURIComponent(/csrf_token=([^;]+)/.exec(jar[who])?.[1] ?? token);
  jar[who + ':csrf'] = token2;
  return { status: r.status, data: await r.json() };
};

const authed = (method, path, { body, as }) =>
  req(method, path, {
    body,
    as,
    headers: { 'x-csrf-token': jar[as + ':csrf'] ?? '' },
  });

// --- 1. logins ---------------------------------------------------------------
const lp = await loginFull('mme.konan@exemple.ci', 'parent');
check('login parent', lp.status === 200, JSON.stringify(lp.data?.user?.role ?? lp.data));
const la = await loginFull('admin@cantine-vatel.demo', 'admin');
check('login admin', la.status === 200);

// --- 2. topup sans clés -> 503 + intent FAILED --------------------------------
const t1 = await authed('POST', '/payments/topups', {
  as: 'parent',
  body: { studentId: aya.id, amount: 5000, operator: 'WAVE', idempotencyKey: 'topup-${RUN}' },
});
check('topup sans clés -> 503', t1.status === 503, JSON.stringify(t1.data));
const failedIntent = await prisma.paymentIntent.findUnique({ where: { idempotencyKey: 'topup-${RUN}' } });
check('intent FAILED enregistré', failedIntent?.status === 'FAILED', failedIntent?.status);

// --- 3. webhook topup : crédit + idempotence ----------------------------------
const intent = await prisma.paymentIntent.create({
  data: {
    reference: TOP_REF,
    parentId: parentUser.id,
    studentId: aya.id,
    amount: 5000,
    operator: 'WAVE',
    providerRef: PR_REF,
    status: 'PENDING',
  },
});
const before = aya.wallet.balance;

const payload = {
  id: TXN_REF,
  amount: { amount: 500000, currency: 'XOF' },
  fees: { amount: 10000, currency: 'XOF' },
  status: 'success',
  transactionType: 'payment',
  paymentMethod: 'wave',
  transactionDetails: { id: PR_REF, reference: TOP_REF },
};

const w1 = await webhook(payload);
check('webhook accepté', w1.status === 200, JSON.stringify(w1.data));
const after = (await prisma.wallet.findUnique({ where: { id: aya.wallet.id } })).balance;
check('wallet crédité +5000', after === before + 5000, `${before} -> ${after}`);
const intentAfter = await prisma.paymentIntent.findUnique({ where: { id: intent.id }, include: { transaction: true } });
check('intent SUCCEEDED + transaction liée', intentAfter.status === 'SUCCEEDED' && Boolean(intentAfter.transaction));

const w2 = await webhook(payload);
check('rejeu ignoré', w2.status === 200 && w2.data?.duplicate === true, JSON.stringify(w2.data));
const after2 = (await prisma.wallet.findUnique({ where: { id: aya.wallet.id } })).balance;
check('pas de double crédit', after2 === after, `${after} -> ${after2}`);

const w3 = await webhook(payload, { badSig: true });
check('mauvaise signature -> 401', w3.status === 401, JSON.stringify(w3.data));

// --- 4. retrait : réservation + échec Jeko -> libération -----------------------
const canteenBefore = (await prisma.canteenAccount.upsert({ where: { id: 1 }, create: { id: 1, balance: 50000 }, update: { balance: 50000 } })).balance;
const wd = await authed('POST', '/withdrawals', {
  as: 'admin',
  body: { amount: 10000, operator: 'ORANGE_MONEY', beneficiaryPhone: '+2250700000099', idempotencyKey: 'wd-${RUN}' },
});
check('retrait sans clés -> 503', wd.status === 503, JSON.stringify(wd.data));
const wdRow = await prisma.withdrawal.findUnique({ where: { idempotencyKey: 'wd-${RUN}' } });
check('retrait marqué FAILED', wdRow?.status === 'FAILED', wdRow?.status);
const canteenAfter = (await prisma.canteenAccount.findUnique({ where: { id: 1 } })).balance;
check('fonds libérés (solde restauré)', canteenAfter === canteenBefore, `${canteenBefore} -> ${canteenAfter}`);
const revTxn = await prisma.transaction.findFirst({ where: { type: 'REVERSAL' }, orderBy: { createdAt: 'desc' } });
check('écriture REVERSAL créée', Boolean(revTxn));

// --- 5. solde insuffisant ------------------------------------------------------
const wd2 = await authed('POST', '/withdrawals', {
  as: 'admin',
  body: { amount: 999999, operator: 'WAVE', beneficiaryPhone: '+2250700000099' },
});
check('retrait > solde -> 422', wd2.status === 422, JSON.stringify(wd2.data?.code));

// --- 6. rôle interdit ----------------------------------------------------------
const wd3 = await authed('POST', '/withdrawals', {
  as: 'parent',
  body: { amount: 1000, operator: 'WAVE', beneficiaryPhone: '+2250700000099' },
});
check('retrait par parent -> 403', wd3.status === 403, JSON.stringify(wd3.data?.code));

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} échec(s).`);
await prisma.$disconnect();
process.exit(failures ? 1 : 0);
