import { useEffect, useState } from 'react';
import Icon from './Icon';
import { toastBus } from './kbr';

let deferredPrompt = null;

// Prompt d'installation PWA : disponible quand le navigateur émet
// beforeinstallprompt ; sur iOS on montre l'astuce « Partager ».
export function useInstallPrompt() {
  const [ready, setReady] = useState(Boolean(deferredPrompt));
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
  );

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setReady(true);
    };
    const onInstalled = () => { deferredPrompt = null; setInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      toastBus.show('Ouvrez le menu Partager puis « Sur l’écran d’accueil »');
      return;
    }
    const { outcome } = await deferredPrompt.prompt();
    deferredPrompt = null;
    setReady(false);
    if (outcome === 'accepted') setInstalled(true);
  };

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { visible: !installed && (ready || isIos), install };
}

// Bouton « Installer l'application » — masqué en mode standalone (app
// déjà installée), après installation, ou si le navigateur ne propose rien.
export default function InstallAppButton({ className = '' }) {
  const { visible, install } = useInstallPrompt();
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={install}
      className={`h-[52px] rounded-[14px] border border-line bg-white text-[16px] font-bold text-marine ${className}`}
    >
      <span className="inline-flex items-center gap-2"><Icon name="plus" sw={2} /> Installer l’application</span>
    </button>
  );
}
