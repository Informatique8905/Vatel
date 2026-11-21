// Couche d'accès métier au-dessus de api() : endpoints réels du backend
// + helpers de formatage (dates, créneaux, montants XOF).
import { api } from './api';

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtDayShort = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const slotText = (s) =>
  `${Math.floor(s.startMinutes / 60)}h${String(s.startMinutes % 60).padStart(2, '0')} – ${Math.floor(s.endMinutes / 60)}h${String(s.endMinutes % 60).padStart(2, '0')}`;

export const RESERVATION_STATUS = {
  CONFIRMED: 'Réservé',
  COLLECTED: 'Servi',
  CANCELLED: 'Annulé, remboursé',
  NOT_COLLECTED: 'Non récupéré',
  PENDING: 'En attente',
};
export const statusColor = (s) =>
  ({ COLLECTED: '#1E7F4F', CONFIRMED: '#072A5D', CANCELLED: '#5C5C5C', NOT_COLLECTED: '#B42318' })[s] ?? '#5C5C5C';

export const TX_LABEL = {
  MEAL_PAYMENT: 'Repas',
  TOPUP: 'Recharge',
  REVERSAL: 'Remboursement',
  ADJUSTMENT: 'Ajustement',
  CANTEEN_WITHDRAWAL: 'Retrait cantine',
};

// Message d'erreur lisible : priorité au message API, sinon codes connus.
const API_MESSAGES = {
  INSUFFICIENT_FUNDS: 'Solde insuffisant.',
  ALLERGEN_BLOCKED: 'Réservation impossible : allergène déclaré dans votre profil.',
  CAPACITY_FULL: 'Plus de place disponible sur cette offre.',
  SLOT_FULL: 'Créneau complet.',
  DEADLINE_PASSED: 'Heure limite de réservation dépassée.',
  ALREADY_COLLECTED: 'Repas déjà récupéré.',
  NOT_COLLECTABLE: 'Cette réservation n’est pas distribuable.',
  WRONG_DATE: 'Cette réservation ne correspond pas au service du jour.',
  JEKO_NOT_CONFIGURED: 'Paiement indisponible : agrégateur non configuré.',
};
export const apiMessage = (err) =>
  API_MESSAGES[err?.code] ?? err?.message ?? 'Une erreur est survenue';

// --- Appels ---
export const getWallet = () => api('/wallets/me');
export const getTransactions = (q = '') => api(`/transactions${q}`);
export const getMenuItems = (q = '') => api(`/menus/items${q}`);
export const getMenuItem = (id) => api(`/menus/items/${id}`);
export const getSlots = (q = '') => api(`/menus/slots${q}`);
export const getAllergens = () => api('/menus/allergens');
export const getReservations = (q = '') => api(`/reservations${q}`);
export const getReservation = (id) => api(`/reservations/${id}`);
export const createReservation = (body) => api('/reservations', { method: 'POST', body });
export const cancelReservation = (id) => api(`/reservations/${id}/cancel`, { method: 'POST', body: {} });
export const getStudentMe = () => api('/students/me');
export const updateDietary = (body) => api('/students/me/dietary', { method: 'PUT', body });
export const getChildren = () => api('/parents/children');
export const getChildWallet = (studentId) => api(`/wallets/${studentId}`);
export const createTopup = (body) => api('/payments/topups', { method: 'POST', body });
export const getTopup = (id) => api(`/payments/${id}`);
export const reconcileTopup = (id) => api(`/payments/${id}/status`);
export const listTopups = (q = '') => api(`/payments${q}`);
export const createInvitation = () => api('/links/invitations', { method: 'POST', body: {} });
export const claimInvitation = (body) => api('/links/claim', { method: 'POST', body });
export const getMyLinks = () => api('/links');
export const getNotifications = (q = '') => api(`/notifications${q}`);
export const scanTicket = (token) => api('/distributions/scan', { method: 'POST', body: { token } });
export const manualCollect = (reservationId) => api('/distributions/manual', { method: 'POST', body: { reservationId } });
export const getDistributions = (q = '') => api(`/distributions${q}`);
export const getCanteen = () => api('/wallets/canteen');
export const getDishes = () => api('/menus/dishes');
export const createDish = (body) => api('/menus/dishes', { method: 'POST', body });
export const updateDish = (id, body) => api(`/menus/dishes/${id}`, { method: 'PATCH', body });
export const uploadDishImage = (id, file) => {
  const body = new FormData();
  body.append('image', file);
  return api(`/menus/dishes/${id}/image`, { method: 'POST', body });
};
export const createMenuItem = (body) => api('/menus/items', { method: 'POST', body });
export const updateMenuItem = (id, body) => api(`/menus/items/${id}`, { method: 'PATCH', body });
