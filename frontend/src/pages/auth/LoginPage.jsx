import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';

// Maquette : eleve-01-connexion
export default function LoginPage() {
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Connexion en cours…');
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Ma Cantine</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" defaultValue="aya.konan@exemple.ci" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" /></div>
        <a href="#" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</a>
      </div>

      <div className="mt-6">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={() => run(() => navigate('/student'))} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription" className="font-bold no-underline">Créer un compte</Link></p>
      <p className="mt-1.5 text-center text-[15px] text-muted">Et vous, parent ? <Link to="/connexion/parent" className="font-bold no-underline">Espace parent</Link></p>
      <p className="mt-auto pt-5 text-center text-[13px] text-muted"><Link to="/connexion/admin" className="font-semibold no-underline text-muted">Personnel de la cantine</Link></p>
      {overlay}
    </div>
  );
}
