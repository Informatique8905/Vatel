import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Inscription parent segmentée en étapes (identité → coordonnées →
// mot de passe). Tous les champs restent montés : FormData conserve
// les saisies en cas de retour arrière. Liaison aux enfants ensuite
// par invitation (QR/lien) — jamais par simple saisie d'e-mail.
const TITLES = {
  identity: 'Qui êtes-vous ?',
  contact: 'Vos coordonnées',
  security: 'Mot de passe',
};
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

export default function ParentRegisterPage() {
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(0);
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Création du compte…');

  const steps = ['identity', 'contact', 'security'];
  const cur = steps[step];

  const val = (n) => String(new FormData(formRef.current).get(n) ?? '').trim();
  const stepOk = () => {
    if (cur === 'identity') return val('nm') !== '';
    if (cur === 'contact') return EMAIL_RE.test(val('em')) && PHONE_RE.test(val('ph').replace(/[\s.-]/g, ''));
    return password.length >= 8;
  };
  const next = () => (stepOk() ? setStep(step + 1) : toastBus.show('Complétez les champs pour continuer'));

  const submit = () => {
    if (!stepOk()) { toastBus.show('Mot de passe : 8 caractères minimum'); return Promise.resolve(false); }
    const fd = new FormData(formRef.current);
    const name = (fd.get('nm') ?? '').trim();
    const sp = name.lastIndexOf(' ');
    const body = {
      firstName: sp > 0 ? name.slice(0, sp) : name,
      lastName: sp > 0 ? name.slice(sp + 1) : '-',
      email: fd.get('em'),
      phone: String(fd.get('ph') ?? '').replace(/[\s.-]/g, ''),
      password,
      role: 'PARENT',
    };
    return run(async () => {
      try {
        await api('/auth/register', { method: 'POST', body });
        navigate(`/verification?email=${encodeURIComponent(body.email)}&to=/parent`);
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Compte parent</h1>

      <div className="mt-5">
        <div className="flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-marine' : 'bg-line'}`} />
          ))}
        </div>
        <p className="mt-2 text-[13px] font-semibold text-muted">Étape {step + 1} sur {steps.length} — {TITLES[cur]}</p>
      </div>

      <div className="flex flex-col gap-[18px] mt-6">
        <div className={cur === 'identity' ? 'pop-in' : 'hidden'}>
          <div className="fld"><label htmlFor="nm">Nom complet</label><Field id="nm" name="nm" type="text" autoComplete="name" /></div>
        </div>

        <div className={cur === 'contact' ? 'pop-in flex flex-col gap-[18px]' : 'hidden'}>
          <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" name="em" type="email" autoComplete="email" /></div>
          <div className="fld"><label htmlFor="ph">Numéro de téléphone</label><Field id="ph" name="ph" type="tel" autoComplete="tel" placeholder="+2250700000000" /></div>
        </div>

        <div className={cur === 'security' ? 'pop-in' : 'hidden'}>
          <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter onChange={setPassword} /></div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="h-[58px] px-6 rounded-[14px] border border-line bg-white text-[16px] font-bold text-ink"
          >
            Retour
          </button>
        )}
        {cur !== 'security' ? (
          <button type="button" onClick={next} className="primary h-[58px] flex-1">Continuer</button>
        ) : (
          <div className="flex-1">
            <AppButton label="Créer mon compte" busyLabel="Création…" doneLabel="Compte créé !" onDone={submit} />
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion/parent" className="font-bold no-underline">Se connecter</Link></p>
      {overlay}
    </form>
  );
}
