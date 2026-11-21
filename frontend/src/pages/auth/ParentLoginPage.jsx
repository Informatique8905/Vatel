import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { apiMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Connexion parent : compte dédié. La liaison aux enfants se fait dans
// l'espace parent (invitation QR/lien), jamais par simple e-mail.
export default function ParentLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { run, overlay } = useActionLoader('Connexion en cours…');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    run(async () => {
      try {
        const user = await login({ email, password });
        if (user.role !== 'PARENT') {
          toastBus.show('Ce compte n’est pas un compte parent');
          navigate(user.role === 'ADMIN' ? '/admin' : '/student');
          return;
        }
        navigate('/parent');
      } catch (err) {
        toastBus.show(apiMessage(err));
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Espace parent</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" onChange={setPassword} /></div>
        <Link to="/mot-de-passe-oublie" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</Link>
      </div>

      <div className="mt-6">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={submit} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription/parent" className="font-bold no-underline">Créer un compte</Link></p>
      <p className="mt-1.5 text-center text-[15px] text-muted">Élève ou employé ? <Link to="/connexion" className="font-bold no-underline">Connexion classique</Link></p>
      {overlay}
    </div>
  );
}
