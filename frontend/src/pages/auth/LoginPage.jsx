import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { PasswordInput, AppButton, Field } from '../../components/common/kbr';

// Maquette : eleve-01-connexion
export default function LoginPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="pop-in w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[36px] leading-[40px] font-black tracking-[-1px]">Ma Cantine</h1>
      <p className="mt-2.5 text-[17px] leading-[25px] text-muted">Réservez votre repas, payez avec votre solde et récupérez-le sans attendre.</p>

      <div className="stagger flex flex-col gap-[18px] mt-9">
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" defaultValue="aya.konan@exemple.ci" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" /></div>
        <a href="#" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</a>
      </div>

      <div className="mt-7">
        <AppButton label="Se connecter" busyLabel="Connexion…" doneLabel="Connecté" onDone={() => navigate('/student')} />
      </div>
      <p className="mt-5 text-center text-[15px] text-muted">Pas de compte ? <Link to="/inscription" className="font-bold no-underline">Créer un compte</Link></p>

      <div className="mt-auto border-t border-line pt-[18px] flex justify-center gap-[22px] text-[14px] font-bold">
        <span className="text-muted font-semibold">Démo :</span>
        <Link to="/student" className="no-underline">Élève</Link>
        <Link to="/parent" className="no-underline">Parent</Link>
        <Link to="/admin" className="no-underline">Cantine</Link>
      </div>
    </div>
  );
}
