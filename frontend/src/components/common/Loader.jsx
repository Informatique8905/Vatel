import { useState } from 'react';

/*
 * Loader « three-body » adapté au projet (sans styled-components).
 * Référence unique pour tous les temps de chargement de l'application :
 * boot initial (index.html), suspense des routes (PageLoader),
 * et actions longues de la démo (connexion, paiement, recharge…) via
 * LoadingOverlay / useActionLoader — ACTION_LOAD_MS par défaut.
 *
 * Props : size (px), color (défaut marine Vatel), speed (s), label?, style?
 */

// Durée du loader sur les actions de la démo (connexion, paiement, recharge…).
export const ACTION_LOAD_MS = 10_000;

const CSS = `
.cv3 {
  --uib-size: 35px;
  --uib-speed: 0.8s;
  --uib-color: #072A5D;
  position: relative;
  display: inline-block;
  height: var(--uib-size);
  width: var(--uib-size);
  animation: cv3-spin calc(var(--uib-speed) * 2.5) infinite linear;
}
.cv3-dot {
  position: absolute;
  height: 100%;
  width: 30%;
}
.cv3-dot:after {
  content: '';
  position: absolute;
  height: 0%;
  width: 100%;
  padding-bottom: 100%;
  background-color: var(--uib-color);
  border-radius: 50%;
}
.cv3-dot:nth-child(1) {
  bottom: 5%;
  left: 0;
  transform: rotate(60deg);
  transform-origin: 50% 85%;
}
.cv3-dot:nth-child(1)::after {
  bottom: 0;
  left: 0;
  animation: cv3-wobble1 var(--uib-speed) infinite ease-in-out;
  animation-delay: calc(var(--uib-speed) * -0.3);
}
.cv3-dot:nth-child(2) {
  bottom: 5%;
  right: 0;
  transform: rotate(-60deg);
  transform-origin: 50% 85%;
}
.cv3-dot:nth-child(2)::after {
  bottom: 0;
  left: 0;
  animation: cv3-wobble1 var(--uib-speed) infinite calc(var(--uib-speed) * -0.15) ease-in-out;
}
.cv3-dot:nth-child(3) {
  bottom: -5%;
  left: 0;
  transform: translateX(116.666%);
}
.cv3-dot:nth-child(3)::after {
  top: 0;
  left: 0;
  animation: cv3-wobble2 var(--uib-speed) infinite ease-in-out;
}
@keyframes cv3-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes cv3-wobble1 {
  0%, 100% { transform: translateY(0%) scale(1); opacity: 1; }
  50% { transform: translateY(-66%) scale(0.65); opacity: 0.8; }
}
@keyframes cv3-wobble2 {
  0%, 100% { transform: translateY(0%) scale(1); opacity: 1; }
  50% { transform: translateY(66%) scale(0.65); opacity: 0.8; }
}
`;

export default function Loader({ size = 35, color = '#072A5D', speed = 0.8, className = '', style }) {
  return (
    <>
      <style>{CSS}</style>
      <div
        className={`cv3 ${className}`}
        style={{ '--uib-size': `${size}px`, '--uib-speed': `${speed}s`, '--uib-color': color, ...style }}
        aria-hidden="true"
      >
        <div className="cv3-dot" />
        <div className="cv3-dot" />
        <div className="cv3-dot" />
      </div>
    </>
  );
}

// Loader de zone/page : centré dans l'espace disponible, pour les Suspense.
export function PageLoader({ label = 'Chargement…', fill = '60vh' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: fill,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <Loader />
      {label && <span style={{ fontSize: 14, fontWeight: 700, color: '#5C5C5C' }}>{label}</span>}
    </div>
  );
}

// Superposition plein écran pour les actions longues (connexion, paiement…).
// Fond dépoli translucide dans le style « verre liquide » de la tab bar.
export function LoadingOverlay({ label = 'Chargement…' }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'rgba(249, 249, 249, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <Loader size={48} />
      {label && <span style={{ fontSize: 16, fontWeight: 700, color: '#072A5D' }}>{label}</span>}
    </div>
  );
}

// Affiche LoadingOverlay pendant ms (ACTION_LOAD_MS par défaut) puis exécute
// l'action : const { busy, run, overlay } = useActionLoader('Paiement…');
// onClick={() => run(() => navigate('/student/ticket'))} + {overlay}
export function useActionLoader(label = 'Chargement…') {
  const [busy, setBusy] = useState(false);
  // Overlay affiché pendant toute la durée réelle de l'action ; renvoie son résultat.
  const run = async (action) => {
    if (busy) return false;
    setBusy(true);
    try {
      return await action?.();
    } finally {
      setBusy(false);
    }
  };
  return { busy, run, overlay: busy ? <LoadingOverlay label={label} /> : null };
}
