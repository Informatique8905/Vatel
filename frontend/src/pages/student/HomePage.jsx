import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import DishPlate from '../../components/common/DishPlate';
import { WEEK_MENU } from '../../data/weekMenu';

const STRIP_CLS = 'flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// Maquette : eleve-02-accueil — refonte accueil (carte solde, plat du jour, aperçu semaine)
export default function HomePage() {
  const [hide, setHide] = useState(false);
  const today = WEEK_MENU.find((d) => d.status === 'today') || WEEK_MENU[0];
  return (
    <div>
      <div className="px-5 pt-[52px] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AvatarLink to="/student/profil" label="Profil" />
          <div className="leading-tight">
            <p className="m-0 text-[13px] font-semibold text-muted">Bonjour,</p>
            <p className="m-0 text-[17px] font-extrabold text-ink">Aya</p>
          </div>
        </div>
        <button type="button" className="ico" aria-label="Notifications"><Icon name="bell" /></button>
      </div>

      <div className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-[22px] bg-marine px-5 py-[18px] text-white">
          <span className="absolute -top-12 -right-9 w-36 h-36 rounded-full bg-vatel/25" aria-hidden="true" />
          <span className="absolute -bottom-14 right-20 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative flex justify-between items-center">
            <span className="text-[14px] font-semibold text-white/85">Solde du portefeuille</span>
            <button type="button" onClick={() => setHide((h) => !h)} aria-label={hide ? 'Afficher le solde' : 'Masquer le solde'} className="w-9 h-9 -mr-2 flex items-center justify-center bg-transparent border-0 text-white/85 cursor-pointer">
              <Icon name="eye" size={20} />
            </button>
          </div>
          <p className="num relative m-0 mt-0.5 text-[40px] leading-[46px] font-black tracking-[-1px]">{hide ? '•••••' : '4 500 F'}</p>
          <div className="relative mt-2 flex justify-between items-center gap-3">
            <span className="text-[12.5px] font-medium text-white/75">Dernier repas · lun. 23 nov.</span>
            <span className="text-[11px] font-bold bg-white/15 rounded-full px-2.5 py-1 whitespace-nowrap">Recharge Wave</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4"><Link className="primary" to="/student/creneau"><Icon name="plus" />Réserver mon repas</Link></div>

      <div className="flex justify-between px-3 pt-[26px]">
        <Link className="act" to="/student/ticket"><span className="c"><Icon name="qr" size={28} /></span>Mon<br />ticket</Link>
        <Link className="act" to="/student/menu"><span className="c"><Icon name="calendar" size={28} /></span>Menu de<br />la semaine</Link>
        <Link className="act" to="/student/profil"><span className="c"><Icon name="shield" size={28} /></span>Mes<br />allergies</Link>
      </div>

      <div className="px-5 pt-[30px] pb-3 flex justify-between items-baseline">
        <h2 className="h2">Aujourd'hui</h2>
        <span className="text-[14px] font-semibold text-muted">avant 10 h 30</span>
      </div>
      <div className="mx-5">
        <Link to="/student/creneau" className="flex items-center gap-4 bg-white rounded-[18px] border border-[#F0F0F0] p-4 no-underline text-ink shadow-[0_10px_24px_-18px_rgba(7,42,93,.35)]">
          <DishPlate dish={today} size={66} />
          <div className="flex-1 min-w-0">
            <b className="block text-[16px] font-bold leading-5">{today.name}</b>
            <small className="block mt-1 text-[13px] text-muted">Poisson · {today.places}</small>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="num text-[13.5px] font-extrabold text-marine bg-tint rounded-lg px-2 py-[3px]">{today.price}</span>
              <span className="text-[11.5px] font-bold text-ok">Réservation ouverte</span>
            </div>
          </div>
          <Icon name="chevronRight" className="text-muted" />
        </Link>
      </div>

      <div className="px-5 pt-7 pb-3 flex justify-between items-baseline">
        <h2 className="h2">Cette semaine</h2>
        <Link to="/student/menu" className="text-[14px] font-bold no-underline text-marine">Tout le menu</Link>
      </div>
      <div className={STRIP_CLS}>
        {WEEK_MENU.map((d) => (
          <Link key={d.key} to="/student/menu" className="flex flex-col items-center gap-1.5 min-w-[78px] bg-white rounded-[14px] border border-[#F0F0F0] py-2.5 px-2 no-underline text-ink">
            <DishPlate dish={d} size={42} />
            <span className="text-[11px] font-bold whitespace-nowrap">{d.day} {d.date}</span>
            <span className={`text-[10px] font-bold whitespace-nowrap ${d.allergen ? 'text-danger' : d.status === 'today' ? 'text-marine' : 'text-muted'}`}>
              {d.allergen ? 'Allergie' : d.status === 'served' ? 'Servi' : d.status === 'today' ? "Auj." : 'À venir'}
            </span>
          </Link>
        ))}
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
