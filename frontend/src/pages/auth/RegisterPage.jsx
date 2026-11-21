import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { VatelSegmented, PasswordInput, AppButton, Field } from '../../components/common/kbr';

// Écran absent des maquettes : construit avec les mêmes composants que eleve-01-connexion.
// Le rôle ADMIN n'est jamais proposé à l'inscription (cahier des charges §12.2).
const ACCOUNT_TYPES = [
  { id: 'student', label: 'Élève / employé' },
  { id: 'parent', label: 'Parent' },
];

export default function RegisterPage() {
  const [type, setType] = useState('student');
  const navigate = useNavigate();

  const submit = (e) => {
    e?.preventDefault();
    navigate(type === 'parent' ? '/parent' : '/student');
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="pop-in w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[36px] leading-[40px] font-black tracking-[-1px]">Créer un compte</h1>
      <p className="mt-2.5 text-[17px] leading-[25px] text-muted">Choisissez votre espace : élève ou employé pour réserver, parent pour recharger et suivre.</p>

      <div className="stagger flex flex-col gap-[18px] mt-9">
        <div className="fld">
          <span className="text-[15px] font-bold">Je suis</span>
          <VatelSegmented options={ACCOUNT_TYPES} value={type} onChange={setType} label="Type de compte" />
        </div>
        <div className="fld"><label htmlFor="nm">Nom complet</label><Field id="nm" type="text" autoComplete="name" /></div>
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter /></div>
      </div>

      <div className="mt-7">
        <AppButton label="Créer mon compte" busyLabel="Création…" doneLabel="Compte créé !" onDone={submit} />
      </div>
      <p className="mt-5 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion" className="font-bold no-underline">Se connecter</Link></p>
    </form>
  );
}
