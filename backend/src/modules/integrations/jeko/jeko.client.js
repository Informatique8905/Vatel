import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../utils/errors.js';

// ---------------------------------------------------------------------------
// Client Jeko Partner API — couche d'intégration ISOLÉE (spec §8).
// Aucun req/res Express ici : seules des entrées/sorties typées.
// Sources : developer.jeko.africa — partner_api.
//   Auth : X-API-KEY + X-API-KEY-ID ; storeId sur chaque opération ;
//   montants en centimes (amountCents) ; signature webhook = HMAC-SHA256
//   du corps brut, hex minuscule (Jeko-Signature).
// ---------------------------------------------------------------------------

// Notre enum -> paymentMethod Jeko pour POST /payment_requests (pay-in).
export const JEKO_PAY_METHOD = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange',
  MTN_MOMO: 'mtn',
  MOOV_MONEY: 'moov',
  DJAMO: 'djamo',
};

// Notre enum -> paymentMethod Jeko pour POST /contacts (pay-out).
// La doc contacts illustre 'orange_money' alors que le pay-in utilise
// 'orange' — à confirmer au premier appel réel si 400/422.
const JEKO_CONTACT_METHOD = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money',
  MTN_MOMO: 'mtn',
  MOOV_MONEY: 'moov',
  DJAMO: 'djamo',
};

export const isConfigured = () =>
  Boolean(env.jekoApiKey && env.jekoApiKeyId && env.jekoStoreId);

const assertConfigured = () => {
  if (!isConfigured()) {
    throw new ApiError(503, 'JEKO_NOT_CONFIGURED', 'Passerelle de paiement non configurée');
  }
};

// Appel REST signé. Renvoie le JSON parsé ou ApiError normalisée.
const request = async (path, { method = 'GET', body } = {}) => {
  assertConfigured();
  let res;
  try {
    res = await fetch(`${env.jekoApiBaseUrl}${path}`, {
      method,
      headers: {
        'X-API-KEY': env.jekoApiKey,
        'X-API-KEY-ID': env.jekoApiKeyId,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new ApiError(502, 'JEKO_UNREACHABLE', 'Passerelle de paiement injoignable', { cause: err.message });
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* réponse non-JSON */ }

  if (!res.ok) {
    // Jeko renvoie {message} / {error} selon les endpoints ; on normalise.
    const code = data?.error?.code ?? data?.code ?? `JEKO_HTTP_${res.status}`;
    const message = data?.error?.message ?? data?.message ?? 'Erreur passerelle de paiement';
    throw new ApiError(res.status === 409 ? 409 : 502, code, message, data ?? undefined);
  }
  return data;
};

// --- Encaissement : payment_requests (checkout hébergé) --------------------

// amountXof : entier XOF -> amountCents (multiple de 100 exigé par Jeko).
export const createPaymentRequest = ({ reference, amountXof, paymentMethod, successUrl, errorUrl }) =>
  request('/payment_requests', {
    method: 'POST',
    body: {
      storeId: env.jekoStoreId,
      amountCents: amountXof * 100,
      currency: 'XOF',
      reference,
      paymentDetails: {
        type: 'redirect',
        data: { paymentMethod, successUrl, errorUrl },
      },
    },
  });

export const getPaymentRequest = (id) => request(`/payment_requests/${id}`);

// --- Contacts bénéficiaires (pay-out) --------------------------------------

export const createContact = ({ name, operator, phone }) =>
  request('/contacts', {
    method: 'POST',
    body: {
      name,
      paymentMethod: JEKO_CONTACT_METHOD[operator],
      identifier: { number: phone },
    },
  });

// --- Décaissement : transfers ----------------------------------------------

export const createTransfer = ({ reference, contactId, amountXof, description }) =>
  request('/transfers', {
    method: 'POST',
    body: {
      storeId: env.jekoStoreId,
      contactId,
      amountCents: amountXof * 100,
      currency: 'XOF',
      reference,
      description,
    },
  });

export const getTransfer = (id) => request(`/transfers/${id}`);

export const getStoreBalance = () => request(`/stores/${env.jekoStoreId}/balance`);

// --- Webhook : vérification de signature ------------------------------------
// Jeko-Signature = HMAC-SHA256(secret, corps brut) en hex minuscule.
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.jekoWebhookSecret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', env.jekoWebhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
