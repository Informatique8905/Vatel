import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Maquette : eleve-01-connexion
export default function LoginPage() {
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Connexion en cours…');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = () => {
    run(async () => {
      try {
        const { user } = await api('/auth/login', { method: 'POST', body: { email, password } });
        navigate(user.role === 'PARENT' ? '/parent' : user.role === 'ADMIN' ? '/admin' : '/student');
      } catch (err) {
        toastBus.show(apiMessage(err));
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="pop-in w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[36px] leading-[40px] font-black tracking-[-1px]">Ma Cantine</h1>
      <p className="mt-2.5 text-[17px] leading-[25px] text-muted">Réservez votre repas, payez avec votre solde et récupérez-le sans attendre.</p>

      <div className="stagger flex flex-col gap-[18px] mt-9">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" onChange={setPassword} /></div>
        <Link to="/mot-de-passe-oublie" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</Link>
      </div>

      <div className="mt-7">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={login} />
      </div>
      <p className="mt-5 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription" className="font-bold no-underline">Créer un compte</Link></p>

      <div className="mt-auto border-t border-line pt-[18px] flex justify-center gap-[22px] text-[14px] font-bold">
        <span className="text-muted font-semibold">Démo :</span>
        <Link to="/student" className="no-underline">Élève</Link>
        <Link to="/parent" className="no-underline">Parent</Link>
        <Link to="/admin" className="no-underline">Cantine</Link>
      </div>
      {overlay}
    </div>
  );
}
