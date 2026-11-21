// Client API : cookies de session (credentials) + jeton CSRF en
// double-submit + rafraîchissement transparent de l'access token.
// Base configurable par VITE_API_URL (ex. http://localhost:4000/api).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const csrfToken = () =>
  document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? '';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const request = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      'x-csrf-token': csrfToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { res, data };
};

// Une seule tentative de refresh en vol : les appels concurrents la partagent.
let refreshing = null;
const tryRefresh = () => {
  refreshing ??= request('/auth/refresh', { method: 'POST', body: {} })
    .then(({ res }) => res.ok)
    .finally(() => { refreshing = null; });
  return refreshing;
};

export const api = async (path, options = {}) => {
  let { res, data } = await request(path, options);
  // Access token expiré -> rotation via le refresh token puis on rejoue.
  if (res.status === 401 && !path.startsWith('/auth/') && (await tryRefresh())) {
    ({ res, data } = await request(path, options));
  }
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Erreur ${res.status}`, {
      status: res.status,
      code: data?.error?.code,
      details: data?.error?.details,
    });
  }
  return data;
};

// Upload multipart (ex. photo de plat) : pas de Content-Type JSON, le
// navigateur pose le boundary multipart. Même gestion CSRF + refresh 401.
export const apiForm = async (path, formData, { method = 'POST' } = {}) => {
  const send = () => fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken() },
    body: formData,
  });
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) res = await send();
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `Erreur ${res.status}`, {
      status: res.status,
      code: data?.error?.code,
      details: data?.error?.details,
    });
  }
  return data;
};

// Message lisible pour l'utilisateur à partir d'une erreur API.
export const apiMessage = (err) =>
  err?.details?.[0]?.message ?? err?.message ?? 'Une erreur est survenue';
