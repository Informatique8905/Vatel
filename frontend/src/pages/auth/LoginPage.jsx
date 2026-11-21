import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { apiMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Maquette : eleve-01-connexion
export default function LoginPage() {
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  // Retour à la page demandée avant connexion (ex. lien d'invitation).
  const back = (home) => (from?.startsWith(home) ? from : home);
  const { login } = useAuth();
  const { run, overlay } = useActionLoader('Connexion en cours…');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    return run(async () => {
      try {
        const user = await login({ email, password });
        navigate(back(user.role === 'PARENT' ? '/parent' : user.role === 'ADMIN' ? '/admin' : '/student'));
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Ma Cantine</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" onChange={setPassword} /></div>
        <Link to="/mot-de-passe-oublie" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</Link>
      </div>

      <div className="mt-6">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={submit} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription" className="font-bold no-underline">Créer un compte</Link></p>
      <p className="mt-1.5 text-center text-[15px] text-muted">Et vous, parent ? <Link to="/connexion/parent" className="font-bold no-underline">Espace parent</Link></p>
      <p className="mt-auto pt-5 text-center text-[13px] text-muted"><Link to="/connexion/admin" className="font-semibold no-underline text-muted">Personnel de la cantine</Link></p>
      {overlay}
    </div>
  );
}
