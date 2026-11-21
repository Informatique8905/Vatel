import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field } from '../../components/common/kbr';
import ChildEmailsField from '../../components/common/ChildEmailsField';
import { useActionLoader } from '../../components/common/Loader';

// Connexion parent : parrainage — le parent renseigne le ou les e-mails
// de ses enfants pour lier les comptes (cahier des charges, ParentStudent).
export default function ParentLoginPage() {
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Connexion en cours…');
  const [children, setChildren] = useState(['']);
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Espace parent</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" /></div>
        <ChildEmailsField emails={children} onChange={setChildren} />
      </div>

      <div className="mt-6">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={() => run(() => navigate('/parent'))} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription/parent" className="font-bold no-underline">Créer un compte</Link></p>
      <p className="mt-1.5 text-center text-[15px] text-muted">Élève ou employé ? <Link to="/connexion" className="font-bold no-underline">Connexion classique</Link></p>
      {overlay}
    </div>
  );
}
