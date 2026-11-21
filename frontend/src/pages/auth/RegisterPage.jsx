import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VatelSegmented, PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Inscription élève/employé segmentée en étapes (la feuille n'affiche
// qu'un groupe de champs à la fois). Tous les champs restent montés :
// FormData conserve les saisies en cas de retour arrière.
// Le rôle ADMIN n'est jamais proposé à l'inscription (cahier des charges §12.2).
const ACCOUNT_TYPES = [
  { id: 'student', label: 'Élève' },
  { id: 'employee', label: 'Employé' },
];
const TITLES = {
  identity: 'Qui êtes-vous ?',
  contact: 'Vos coordonnées',
  school: 'Votre scolarité',
  security: 'Mot de passe',
};
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

export default function RegisterPage() {
  const [type, setType] = useState('student');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(0);
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Création du compte…');

  const steps = ['identity', 'contact', ...(type === 'student' ? ['school'] : []), 'security'];
  const last = steps.length - 1;
  const cur = steps[step];

  const val = (n) => String(new FormData(formRef.current).get(n) ?? '').trim();
  const stepOk = () => {
    if (cur === 'identity') return val('ln') !== '' && val('fn') !== '';
    if (cur === 'contact') return EMAIL_RE.test(val('em')) && PHONE_RE.test(val('ph').replace(/[\s.-]/g, ''));
    if (cur === 'school') return val('mat') !== '' && val('lv') !== '' && val('gr') !== '';
    return password.length >= 8;
  };
  const next = () => (stepOk() ? setStep(step + 1) : toastBus.show('Complétez les champs pour continuer'));

  const submit = () => {
    if (!stepOk()) { toastBus.show('Mot de passe : 8 caractères minimum'); return Promise.resolve(false); }
    const fd = new FormData(formRef.current);
    const body = {
      firstName: fd.get('fn'),
      lastName: fd.get('ln'),
      email: fd.get('em'),
      phone: String(fd.get('ph') ?? '').replace(/[\s.-]/g, ''),
      password,
      role: 'STUDENT',
      kind: type === 'student' ? 'STUDENT' : 'EMPLOYEE',
      ...(type === 'student' && {
        matricule: fd.get('mat'),
        level: fd.get('lv'),
        grade: fd.get('gr'),
      }),
    };
    return run(async () => {
      try {
        await api('/auth/register', { method: 'POST', body });
        navigate(`/verification?email=${encodeURIComponent(body.email)}&to=/student`);
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Créer un compte</h1>

      <div className="mt-5">
        <div className="flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-marine' : 'bg-line'}`} />
          ))}
        </div>
        <p className="mt-2 text-[13px] font-semibold text-muted">Étape {step + 1} sur {steps.length} — {TITLES[cur]}</p>
      </div>

      <div className="flex flex-col gap-[18px] mt-6">
        <div className={cur === 'identity' ? 'pop-in flex flex-col gap-[18px]' : 'hidden'}>
          <div className="fld">
            <span className="text-[15px] font-bold">Je suis</span>
            <VatelSegmented options={ACCOUNT_TYPES} value={type} onChange={setType} label="Type de compte" />
          </div>
          <div className="fld"><label htmlFor="ln">Nom</label><Field id="ln" name="ln" type="text" autoComplete="family-name" /></div>
          <div className="fld"><label htmlFor="fn">Prénom</label><Field id="fn" name="fn" type="text" autoComplete="given-name" /></div>
        </div>

        <div className={cur === 'contact' ? 'pop-in flex flex-col gap-[18px]' : 'hidden'}>
          <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" name="em" type="email" autoComplete="email" /></div>
          <div className="fld"><label htmlFor="ph">Numéro de téléphone</label><Field id="ph" name="ph" type="tel" autoComplete="tel" placeholder="+2250700000000" /></div>
        </div>

        <div className={cur === 'school' ? 'pop-in flex flex-col gap-[18px]' : 'hidden'}>
          <div className="fld"><label htmlFor="mat">Matricule</label><Field id="mat" name="mat" type="text" autoComplete="off" placeholder="Ex. VAT-2026-001" /></div>
          <div className="fld"><label htmlFor="lv">Niveau</label><Field id="lv" name="lv" type="text" autoComplete="off" placeholder="Ex. Lycée" /></div>
          <div className="fld"><label htmlFor="gr">Classe</label><Field id="gr" name="gr" type="text" autoComplete="off" placeholder="Ex. Terminale A" /></div>
        </div>

        <div className={cur === 'security' ? 'pop-in' : 'hidden'}>
          <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter onChange={setPassword} /></div>
        </div>
      </div>

      <div className="mt-7 flex gap-3">
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
      <p className="mt-5 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion" className="font-bold no-underline">Se connecter</Link></p>
      {overlay}
    </form>
  );
}
