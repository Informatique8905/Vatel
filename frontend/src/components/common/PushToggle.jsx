import { useEffect, useState } from 'react';
import Toggle from './Toggle';
import { toastBus } from './kbr';
import { disablePush, enablePush, pushEnabled, pushSupported } from '../../services/push';

// Ligne « Notifications push » : active FCM sur cet appareil.
export default function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(pushEnabled());
  const [busy, setBusy] = useState(false);

  useEffect(() => { pushSupported().then(setSupported); }, []);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        toastBus.show('Notifications push désactivées sur cet appareil');
      } else {
        await enablePush();
        setOn(true);
        toastBus.show('Notifications push activées');
      }
    } catch (err) {
      toastBus.show(err?.message ?? 'Activation impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-[16px] border border-line px-4 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <b className="block text-[16px]">Notifications push</b>
        <span className="block text-[14px] text-muted">
          {supported ? 'Réservations, recharges et rappels sur cet appareil' : 'Non disponibles sur ce navigateur'}
        </span>
      </div>
      {supported && <Toggle label="Notifications push" checked={on} onChange={toggle} />}
    </div>
  );
}
