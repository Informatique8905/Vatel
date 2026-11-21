// Test : bootstrap admin + endpoints image plat (sans clés Cloudinary réelles).
// Usage : node --env-file=.env scripts/test-admin-images.mjs
import { prisma } from '../src/database/prisma.js';

const API = 'http://localhost:4000/api';
const jar = {};
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  OK ' : ' FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures += 1;
};

const loginFull = async (email, who) => {
  const r0 = await fetch(`${API}/health`);
  const c0 = r0.headers.get('set-cookie') ?? '';
  const token = decodeURIComponent(/csrf_token=([^;]+)/.exec(c0)?.[1] ?? '');
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: c0, 'x-csrf-token': token },
    body: JSON.stringify({ email, password: 'VatelDemo2026!' }),
  });
  const sc = r.headers.get('set-cookie') ?? '';
  jar[who] = [c0, ...sc.split(/,(?=\s*\w+=)/).map((c) => c.split(';')[0])].join('; ');
  jar[who + ':csrf'] = decodeURIComponent(/csrf_token=([^;]+)/.exec(jar[who])?.[1] ?? token);
  return { status: r.status, data: await r.json() };
};

const authed = (method, path, { as, body, rawHeaders = {}, rawBody } = {}) =>
  fetch(API + path, {
    method,
    headers: {
      Cookie: jar[as],
      'x-csrf-token': jar[as + ':csrf'],
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...rawHeaders,
    },
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));

// PNG minimal valide (signature + IHDR)
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000000000000049454e44ae426082',
  'hex',
);
// Faux "jpeg" : contenu texte déguisé
const FAKE = Buffer.from('ceci n est pas une image');

const multipart = (buf, filename = 'plat.png', mime = 'image/png') => {
  const boundary = '----vtltest' + Date.now();
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, buf, tail]),
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  };
};

// --- login ------------------------------------------------------------------
const la = await loginFull('admin@cantine-vatel.demo', 'admin');
check('login admin', la.status === 200);
const ls = await loginFull('aya.konan@exemple.ci', 'student');
check('login élève', ls.status === 200);

// --- dish de test -------------------------------------------------------------
const dish = await prisma.dish.create({ data: { name: 'Plat test image ' + Date.now() } });

// --- uploads -----------------------------------------------------------------
const noFile = await authed('POST', `/menus/dishes/${dish.id}/image`, { as: 'admin', body: {} });
check('sans fichier -> 400/415', [400, 415].includes(noFile.status), JSON.stringify(noFile.data?.error?.code));

const bad = multipart(FAKE, 'fake.png', 'image/png');
const rBad = await authed('POST', `/menus/dishes/${dish.id}/image`, {
  as: 'admin', rawBody: bad.body, rawHeaders: bad.headers,
});
check('type réel invalide -> 415', rBad.status === 415, JSON.stringify(rBad.data?.error?.code));

const ok = multipart(PNG);
const rOk = await authed('POST', `/menus/dishes/${dish.id}/image`, {
  as: 'admin', rawBody: ok.body, rawHeaders: ok.headers,
});
check('PNG valide sans clés -> 503 CLOUDINARY', rOk.status === 503 && rOk.data?.error?.code === 'CLOUDINARY_NOT_CONFIGURED', JSON.stringify(rOk.data?.error?.code));

const forbidden = await authed('POST', `/menus/dishes/${dish.id}/image`, {
  as: 'student', rawBody: ok.body, rawHeaders: ok.headers,
});
check('upload par élève -> 403', forbidden.status === 403);

const mimetypeBlock = multipart(PNG, 'plat.gif', 'image/gif');
const rMime = await authed('POST', `/menus/dishes/${dish.id}/image`, {
  as: 'admin', rawBody: mimetypeBlock.body, rawHeaders: mimetypeBlock.headers,
});
check('mimetype déclaré GIF -> 415', rMime.status === 415, JSON.stringify(rMime.data?.error?.code));

await prisma.dish.delete({ where: { id: dish.id } });
console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} échec(s).`);
await prisma.$disconnect();
process.exit(failures ? 1 : 0);
