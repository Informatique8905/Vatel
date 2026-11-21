import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VatelSegmented, PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Écran absent des maquettes : construit avec les mêmes composants que eleve-01-connexion.
// Le rôle ADMIN n'est jamais proposé à l'inscription (cahier des charges §12.2).
const ACCOUNT_TYPES = [
  { id: 'student', label: 'Élève' },
  { id: 'employee', label: 'Employé' },
];

export default function RegisterPage() {
  const [type, setType] = useState('student');
  const [password, setPassword] = useState('');
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Création du compte…');

  // Précharge l'écran OTP : sinon le bouton reste sur « Compte créé ! » le temps du chargement.
  useEffect(() => { import('./VerifyEmailPage'); }, []);

  const submit = () => {
    const fd = new FormData(formRef.current);
    const body = {
      firstName: fd.get('fn'),
      lastName: fd.get('ln'),
      email: fd.get('em'),
      phone: fd.get('ph'),
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

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld">
          <span className="text-[15px] font-bold">Je suis</span>
          <VatelSegmented options={ACCOUNT_TYPES} value={type} onChange={setType} label="Type de compte" />
        </div>
        <div className="fld"><label htmlFor="ln">Nom</label><Field id="ln" name="ln" type="text" autoComplete="family-name" /></div>
        <div className="fld"><label htmlFor="fn">Prénom</label><Field id="fn" name="fn" type="text" autoComplete="given-name" /></div>
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" name="em" type="email" autoComplete="email" /></div>
        <div className="fld"><label htmlFor="ph">Numéro de téléphone</label><Field id="ph" name="ph" type="tel" autoComplete="tel" placeholder="+225 …" /></div>
        {type === 'student' && (
          <div className="pop-in flex flex-col gap-[18px]">
            <div className="fld"><label htmlFor="mat">Matricule</label><Field id="mat" name="mat" type="text" autoComplete="off" placeholder="Ex. VAT-2026-001" /></div>
            <div className="fld"><label htmlFor="lv">Niveau</label><Field id="lv" name="lv" type="text" autoComplete="off" placeholder="Ex. Lycée" /></div>
            <div className="fld"><label htmlFor="gr">Classe</label><Field id="gr" name="gr" type="text" autoComplete="off" placeholder="Ex. Terminale A" /></div>
          </div>
        )}
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter onChange={setPassword} /></div>
      </div>

      <div className="mt-7">
        <AppButton label="Créer mon compte" busyLabel="Création…" doneLabel="Compte créé !" onDone={submit} />
      </div>
      <p className="mt-5 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion" className="font-bold no-underline">Se connecter</Link></p>
      {overlay}
    </form>
  );
}
