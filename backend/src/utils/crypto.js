import crypto from 'node:crypto';

// Jeton opaque non prédictible (refresh token, QR code, jetons email/reset).
// Jamais stocké en clair en base : on persiste uniquement son hash SHA-256.
export const randomToken = (bytes = 48) =>
  crypto.randomBytes(bytes).toString('base64url');

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Référence métier unique lisible (paiements, retraits, transactions…).
export const makeReference = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
