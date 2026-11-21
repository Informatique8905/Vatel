import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';

// Maquette : eleve-01-connexion
export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[36px] leading-[40px] font-black tracking-[-1px]">Ma Cantine</h1>
      <p className="mt-2.5 text-[17px] leading-[25px] text-muted">Réservez votre repas, payez avec votre solde et récupérez-le sans attendre.</p>

      <div className="flex flex-col gap-[18px] mt-9">
        <div className="fld"><label htmlFor="em">E-mail</label><input id="em" type="email" defaultValue="aya.konan@exemple.ci" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><input id="pw" type="password" defaultValue="motdepasse" /></div>
        <a href="#" className="self-end text-[15px] font-bold no-underline text-marine">Mot de passe oublié ?</a>
      </div>

      <Link className="primary mt-7" to="/student">Se connecter</Link>
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
