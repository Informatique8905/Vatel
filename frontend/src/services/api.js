// Client API minimal : cookies de session (credentials) + jeton CSRF
// en double-submit (le cookie csrf_token est renvoyé dans x-csrf-token).
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

export const api = async (path, { method = 'GET', body } = {}) => {
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
