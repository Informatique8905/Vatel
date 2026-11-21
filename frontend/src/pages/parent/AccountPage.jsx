import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import Toggle from '../../components/common/Toggle';
import { toastBus } from '../../components/common/kbr';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const initials = (u) =>
  `${u?.firstName?.[0] ?? '?'}${u?.lastName?.[0] ?? ''}`.toUpperCase();

// Compte parent : identité, préférences de notifications (rappels repas des
// enfants — opt-in désactivé par défaut) et déconnexion. Même structure que
// le profil élève pour garder la cohérence visuelle entre espaces.
export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: prefs, loading } = useData(
    () => api('/notifications/preferences').then((p) => p.preferences),
    [],
  );
  const [remindersOn, setRemindersOn] = useState(null);
  useEffect(() => {
    if (prefs && remindersOn === null) setRemindersOn(Boolean(prefs.notifyChildReminders));
  }, [prefs, remindersOn]);

  const setChildReminders = async () => {
    const value = !remindersOn;
    setRemindersOn(value);
    try {
      await api('/notifications/preferences', { method: 'PATCH', body: { notifyChildReminders: value } });
      toastBus.show(value ? 'Rappels enfants activés' : 'Rappels enfants désactivés');
    } catch {
      setRemindersOn(!value);
      toastBus.show('Préférence non enregistrée');
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-[52px]">
        <AvatarLink label="Compte" />
        <h1 className="h1 mt-[22px]">Compte</h1>
        <p className="mt-1.5 text-[16px] text-muted">{user?.email ?? ''}</p>
      </div>

      <div className="px-5 pt-6 pb-10 flex flex-col gap-6">
        <div className="list rounded-[20px] border border-line bg-white overflow-hidden shadow-[0_1px_3px_rgba(7,42,93,.06)]">
          <div className="li">
            <span className="w-12 h-12 rounded-[24px] bg-tint text-marine flex items-center justify-center text-[17px] font-extrabold flex-none">
              {initials(user)}
            </span>
            <div className="t">
              <b>{user ? `${user.firstName} ${user.lastName}` : '…'}</b>
              <small>{[user?.phone, 'Compte parent'].filter(Boolean).join(' · ')}</small>
            </div>
          </div>
        </div>

        <section>
          <h2 className="h2 mb-3">Notifications</h2>
          <div className="bg-white rounded-[16px] border border-line px-4 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <b className="block text-[16px]">Rappels repas des enfants</b>
              <span className="block text-[14px] text-muted">Notification quand le repas de votre enfant approche de son créneau</span>
            </div>
            {loading || remindersOn === null ? null : (
              <Toggle
                label="Rappels repas des enfants"
                checked={remindersOn}
                onChange={setChildReminders}
              />
            )}
          </div>
        </section>

        <button
          type="button"
          className="h-[52px] rounded-[14px] border border-line bg-white text-[16px] font-bold text-danger"
          onClick={async () => { await logout(); navigate('/connexion', { replace: true }); }}
        >
          <span className="inline-flex items-center gap-2"><Icon name="logout" sw={2} /> Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}
