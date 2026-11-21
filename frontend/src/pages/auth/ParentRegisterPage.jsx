import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field } from '../../components/common/kbr';
import ChildEmailsField from '../../components/common/ChildEmailsField';
import { useActionLoader } from '../../components/common/Loader';

// Inscription parent : compte dédié + parrainage par e-mail(s) des enfants.
export default function ParentRegisterPage() {
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Création du compte…');
  const [children, setChildren] = useState(['']);
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => navigate('/parent')); }} className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Compte parent</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="nm">Nom complet</label><Field id="nm" type="text" autoComplete="name" /></div>
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter /></div>
        <ChildEmailsField emails={children} onChange={setChildren} />
      </div>

      <div className="mt-6">
        <AppButton label="Créer mon compte" busyLabel="Création…" doneLabel="Compte créé !" onDone={() => run(() => navigate('/parent'))} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion/parent" className="font-bold no-underline">Se connecter</Link></p>
      {overlay}
    </form>
  );
}
