import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import { HoldButton, toastBus } from '../../components/common/kbr';
import Toggle from '../../components/common/Toggle';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { getStudentMe, updateDietary } from '../../services/cantine';
import { api } from '../../services/api';

// Profil élève : identité, déclarations alimentaires (§7), préférences de
// notifications et déconnexion. Sauvegarde via PUT /students/me/dietary.
export default function DietaryProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading } = useData(() => getStudentMe(), []);

  const [selAllergens, setSelAllergens] = useState(null);
  const [selRestr, setSelRestr] = useState(null);
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);

  const allergens = data?.allergens ?? [];
  const restrictions = data?.restrictions ?? [];

  useEffect(() => {
    if (!data || selAllergens !== null) return;
    setSelAllergens(new Set(allergens.filter((a) => a.declared).map((a) => a.code)));
    setSelRestr(new Set(restrictions.filter((r) => r.declared).map((r) => r.code)));
  }, [data, allergens, restrictions, selAllergens]);

  // Préférences de notifications (rappels créneau, opt-in élève).
  const [remindersOn, setRemindersOn] = useState(null);
  useData(
    () => api('/notifications/preferences').then((p) => {
      setRemindersOn((v) => v ?? Boolean(p.preferences?.notifySlotReminders ?? true));
      return p;
    }),
    [],
  );

  const toggle = (set, code, setter) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code); else next.add(code);
    setter(next);
  };

  const customs = useMemo(() => allergens.filter((a) => a.custom), [allergens]);

  const save = async () => {
    setSaving(true);
    try {
      const extras = extra.split(',').map((s) => s.trim()).filter(Boolean);
      await updateDietary({
        allergens: [...(selAllergens ?? []), ...extras],
        restrictions: [...(selRestr ?? [])],
      });
      await api('/notifications/preferences', { method: 'PATCH', body: { notifySlotReminders: remindersOn } });
      toastBus.show('Profil alimentaire enregistré');
      setExtra('');
      window.location.reload();
    } catch (err) {
      toastBus.show(err.message ?? 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const p = data?.profile;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-[52px]">
        <AvatarLink label="Profil" />
        <h1 className="h1 mt-[22px]">Profil</h1>
        <p className="mt-1.5 text-[16px] text-muted">{user?.email ?? ''}</p>
      </div>

      {loading || selAllergens === null ? <PageLoader /> : (
        <div className="px-5 pt-6 pb-10 flex flex-col gap-6">
          <div className="list rounded-[20px] border border-line bg-white overflow-hidden shadow-[0_1px_3px_rgba(7,42,93,.06)]">
            <div className="li">
              <span className="w-12 h-12 rounded-[24px] bg-tint text-marine flex items-center justify-center text-[17px] font-extrabold flex-none">
                {(p?.firstName?.[0] ?? '?')}{(p?.lastName?.[0] ?? '')}
              </span>
              <div className="t">
                <b>{p ? `${p.firstName} ${p.lastName}` : '…'}</b>
                <small>{[p?.matricule, p?.grade, p?.kind === 'EMPLOYEE' ? 'Employé' : null].filter(Boolean).join(' · ')}</small>
              </div>
            </div>
          </div>

          <section>
            <h2 className="h2 mb-3">Allergies déclarées</h2>
            <p className="text-[14px] text-muted -mt-2 mb-3">Un plat contenant l’un d’eux ne pourra pas être réservé.</p>
            <div className="flex flex-wrap gap-2">
              {allergens.filter((a) => !a.custom).map((a) => (
                <button
                  key={a.code}
                  type="button"
                  aria-pressed={selAllergens.has(a.code)}
                  onClick={() => toggle(selAllergens, a.code, setSelAllergens)}
                  className={`h-10 px-3.5 rounded-full border text-[14px] font-bold transition active:scale-95 ${selAllergens.has(a.code) ? 'bg-danger border-danger text-white' : 'bg-white border-line text-muted'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            {customs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {customs.map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => toggle(selAllergens, a.code, setSelAllergens)}
                    className={`h-10 px-3.5 rounded-full border text-[14px] font-bold ${selAllergens.has(a.code) ? 'bg-danger border-danger text-white' : 'bg-white border-line text-muted'}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
            <label className="mt-4 block">
              <span className="text-[13px] font-semibold text-muted">Autre allergène (séparés par des virgules)</span>
              <input
                className="mt-1.5 w-full h-12 px-4 rounded-[12px] border border-line text-[15px] outline-none focus:border-marine"
                placeholder="Ex : sésame, fraise…"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </label>
          </section>

          {restrictions.length > 0 && (
            <section>
              <h2 className="h2 mb-3">Restrictions alimentaires</h2>
              <div className="flex flex-wrap gap-2">
                {restrictions.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    aria-pressed={selRestr.has(r.code)}
                    onClick={() => toggle(selRestr, r.code, setSelRestr)}
                    className={`h-10 px-3.5 rounded-full border text-[14px] font-bold transition active:scale-95 ${selRestr.has(r.code) ? 'bg-marine border-marine text-white' : 'bg-white border-line text-muted'}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="h2 mb-3">Notifications</h2>
            <div className="bg-white rounded-[16px] border border-line px-4 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <b className="block text-[16px]">Rappels de créneau</b>
                <span className="block text-[14px] text-muted">5 min avant le début et avant la fin de votre créneau</span>
              </div>
              <Toggle
                label="Rappels de créneau"
                checked={remindersOn ?? true}
                onChange={() => setRemindersOn(!(remindersOn ?? true))}
              />
            </div>
          </section>

          <div className="flex flex-col gap-3">
            {saving ? (
              <button type="button" disabled className="primary h-[58px] justify-center opacity-60">Enregistrement…</button>
            ) : (
              <HoldButton label="Enregistrer mon profil" holdMs={700} onConfirm={save} />
            )}
            <button
              type="button"
              className="h-[52px] rounded-[14px] border border-line bg-white text-[16px] font-bold text-danger"
              onClick={async () => { await logout(); navigate('/connexion', { replace: true }); }}
            >
              <span className="inline-flex items-center gap-2"><Icon name="logout" sw={2} /> Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
