import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import PushToggle from '../../components/common/PushToggle';
import InstallAppButton from '../../components/common/InstallAppButton';
import { AppButton, toastBus } from '../../components/common/kbr';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../hooks/useData';
import { apiMessage, claimInvitation, getMyLinks } from '../../services/cantine';

// Le parent colle le lien ou le code d'invitation créé par l'élève.
const extractToken = (value) => {
  const v = value.trim();
  try {
    return new URL(v).searchParams.get('token') ?? v;
  } catch {
    return v;
  }
};

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('token') ?? '');
  const { data, reload } = useData(() => getMyLinks(), []);
  const links = (data?.links ?? []).filter((l) => l.status === 'APPROVED');

  const claim = async () => {
    const token = extractToken(code);
    if (token.length < 20) {
      toastBus.show('Collez le lien ou le code d’invitation reçu de votre enfant');
      return false;
    }
    try {
      await claimInvitation({ token, method: 'INVITATION_LINK' });
      toastBus.show('Enfant lié à votre compte');
      setCode('');
      reload();
      return true;
    } catch (err) {
      toastBus.show(apiMessage(err));
      return false;
    }
  };

  return (
    <div className="px-5 pt-[52px] pb-8 flex flex-col gap-7">
      <div>
        <h1 className="h1">Mon compte</h1>
        <p className="mt-1.5 text-[16px] text-muted">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}</p>
      </div>

      <section>
        <h2 className="h2 mb-3">Lier un enfant</h2>
        <div className="bg-white rounded-[16px] border border-line px-4 py-4 flex flex-col gap-3">
          <p className="text-[14px] text-muted">
            Dans son profil, votre enfant crée un lien d’invitation. Ouvrez ce lien ou collez-le ici.
          </p>
          <input
            className="h-[52px] rounded-[14px] border border-line px-4 text-[15px]"
            placeholder="Lien ou code d’invitation"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Lien ou code d’invitation"
          />
          <AppButton label="Lier cet enfant" busyLabel="Liaison…" doneLabel="Enfant lié" onDone={claim} />
        </div>
        {links.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.id} className="bg-white rounded-[14px] border border-line px-4 py-3 text-[15px]">
                <b>{l.student?.name ?? 'Enfant'}</b>
                <button type="button" className="float-right text-marine font-semibold" onClick={() => navigate('/parent')}>Voir</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h2 mb-3">Notifications</h2>
        <PushToggle />
      </section>

      <InstallAppButton />
      <button
        type="button"
        className="h-[52px] rounded-[14px] border border-line bg-white text-[16px] font-bold text-danger"
        onClick={async () => { await logout(); navigate('/connexion/parent', { replace: true }); }}
      >
        <span className="inline-flex items-center gap-2"><Icon name="logout" sw={2} /> Se déconnecter</span>
      </button>
    </div>
  );
}
