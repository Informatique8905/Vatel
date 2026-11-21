import { useState } from 'react';
import { AppButton, toastBus } from '../common/kbr';
import { apiMessage, createInvitation } from '../../services/cantine';

// L'élève crée un lien d'invitation à usage unique pour son parent.
export default function InviteParent() {
  const [link, setLink] = useState('');

  const create = async () => {
    try {
      const { invitation } = await createInvitation();
      setLink(`${window.location.origin}/parent/compte?token=${encodeURIComponent(invitation.token)}`);
      return true;
    } catch (err) {
      toastBus.show(apiMessage(err));
      return false;
    }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Cantine Vatel', text: 'Lie ton compte parent', url: link });
      else {
        await navigator.clipboard.writeText(link);
        toastBus.show('Lien copié');
      }
    } catch { /* partage annulé */ }
  };

  return (
    <div className="bg-white rounded-[16px] border border-line px-4 py-4 flex flex-col gap-3">
      <p className="text-[14px] text-muted">Créez un lien et envoyez-le à votre parent : il pourra recharger votre compte et suivre vos repas.</p>
      {link ? (
        <>
          <input readOnly className="h-[52px] rounded-[14px] border border-line px-4 text-[13px]" value={link} aria-label="Lien d’invitation" onFocus={(e) => e.target.select()} />
          <button type="button" className="primary h-[52px] justify-center" onClick={share}>Partager le lien</button>
        </>
      ) : (
        <AppButton label="Créer un lien d’invitation" busyLabel="Création…" doneLabel="Lien prêt" onDone={create} />
      )}
    </div>
  );
}
