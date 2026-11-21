import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';

// Maquette : eleve-02-accueil
export default function HomePage() {
  return (
    <div>
      <div className="px-5 pt-[52px] flex justify-between items-center">
        <AvatarLink to="/student/profil" label="Profil" />
        <button type="button" className="ico" aria-label="Notifications"><Icon name="bell" /></button>
      </div>

      <div className="px-5 pt-[18px] flex flex-col items-center gap-1.5">
        <span className="text-[17px] font-semibold text-muted flex items-center gap-2">Solde <Icon name="eye" size={20} /></span>
        <span className="num text-[52px] leading-[60px] font-black tracking-[-1.5px] text-ink">4 500 F</span>
      </div>

      <div className="px-5 pt-[18px]"><Link className="primary" to="/student/creneau"><Icon name="plus" />Réserver mon repas</Link></div>

      <div className="flex justify-between px-3 pt-[30px]">
        <Link className="act" to="/student/ticket"><span className="c"><Icon name="qr" size={28} /></span>Mon<br />ticket</Link>
        <Link className="act" to="/student/menu"><span className="c"><Icon name="calendar" size={28} /></span>Menu de<br />la semaine</Link>
        <Link className="act" to="/student/profil"><span className="c"><Icon name="shield" size={28} /></span>Mes<br />allergies</Link>
      </div>

      <div className="px-5 pt-[34px] pb-3 flex justify-between items-baseline">
        <h2 className="h2">Aujourd'hui</h2>
        <span className="text-[14px] font-semibold text-muted">avant 10 h 30</span>
      </div>
      <div className="list">
        <Link className="li" to="/student/creneau">
          <span className="w-[52px] h-[52px] rounded-[26px] bg-tint flex items-center justify-center flex-none">
            <span className="w-[30px] h-[30px] rounded-[15px] border-2 border-vatel bg-white box-content" />
          </span>
          <div className="t"><b>Attiéké poisson braisé</b><small>Poisson · 46 places restantes</small></div>
          <span className="num text-[16px] font-extrabold text-marine">1 500 F</span>
        </Link>
      </div>

      <div className="px-5 pt-7 pb-3 flex justify-between items-baseline">
        <h2 className="h2">Historique</h2>
        <Link to="/student/solde" className="text-[14px] font-bold no-underline text-marine">Tout afficher</Link>
      </div>
      <div className="list">
        <div className="li"><div className="t"><b>Riz sauce graine</b><small>Servi · lun. 23 nov.</small></div><span className="num text-[16px] font-bold text-danger">−1 500 F</span></div>
        <div className="li"><div className="t"><b>Recharge parent</b><small>Wave · ven. 20 nov.</small></div><span className="num text-[16px] font-bold text-ok">+10 000 F</span></div>
      </div>
    </div>
  );
}
