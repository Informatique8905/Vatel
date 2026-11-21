import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { api } from './api';

// Notifications push réelles via Firebase Cloud Messaging. Config publique
// injectée au build (VITE_FIREBASE_*) ; le service worker /push-sw.js
// affiche les messages data-only envoyés par le backend (firebase-admin).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const STORAGE_KEY = 'vatel:fcm-token';

let messaging;
const getFcm = () => (messaging ??= getMessaging(initializeApp(config, 'vatel')));

export const pushSupported = async () =>
  Boolean(config.apiKey && config.appId && VAPID_KEY)
  && 'serviceWorker' in navigator
  && 'Notification' in window
  && (await isSupported().catch(() => false));

export const pushEnabled = () =>
  typeof Notification !== 'undefined'
  && Notification.permission === 'granted'
  && Boolean(localStorage.getItem(STORAGE_KEY));

// Demande l'autorisation, récupère le jeton FCM et l'enregistre côté serveur.
export const enablePush = async () => {
  if (!(await pushSupported())) throw new Error('Notifications push non disponibles sur ce navigateur');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Autorisez les notifications dans les réglages du navigateur');
  const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  // Sans délai, un service push injoignable laisse le bouton tourner indéfiniment.
  const token = await Promise.race([
    getToken(getFcm(), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Le service de notifications ne répond pas, réessayez plus tard')), 30000)),
  ]);
  if (!token) throw new Error('Impossible d’obtenir le jeton de notification');
  await api('/push/fcm-tokens', { method: 'POST', body: { token, userAgent: navigator.userAgent.slice(0, 300) } });
  localStorage.setItem(STORAGE_KEY, token);
  return token;
};

// Désactivation explicite : l'appareil ne reçoit plus rien.
export const disablePush = async () => {
  const token = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  if (!token) return;
  await api('/push/fcm-tokens', { method: 'DELETE', body: { token } }).catch(() => {});
  if (await pushSupported()) await deleteToken(getFcm()).catch(() => {});
};

// À la connexion : réattache le jeton de l'appareil au compte connecté.
export const syncPush = async () => {
  if (pushEnabled()) await enablePush().catch(() => {});
};

// À la déconnexion : détache l'appareil du compte (le choix local est gardé,
// un nouveau jeton est créé à la prochaine connexion).
// Le jeton local est supprimé aussi : même si l'appel serveur échoue, FCM le
// refuse ensuite et l'appareil déconnecté ne reçoit plus rien.
export const detachPush = async () => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return;
  await api('/push/fcm-tokens', { method: 'DELETE', body: { token } }).catch(() => {});
  if (await pushSupported()) await deleteToken(getFcm()).catch(() => {});
};
