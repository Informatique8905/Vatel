import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';

const Chevron = () => <Icon name="chevronRight" size={20} className="text-muted" />;

// Maquette : eleve-03-semaine
export default function WeekMenuPage() {
  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink to="/student/profil" label="Profil" />
        <h1 className="mt-[22px] text-[34px] leading-[40px] font-black tracking-[-1px]">Menu</h1>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[16px] text-muted">Semaine du 23 au 27 novembre</span>
          <div className="flex gap-1">
            <button type="button" aria-label="Semaine précédente" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronLeft" /></button>
            <button type="button" aria-label="Semaine suivante" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronRight" /></button>
          </div>
        </div>
      </div>

      <div className="list mt-[18px]">
        <div className="li gap-4 py-[18px] text-muted">
          <div className="d"><small>Lun</small><b>23</b></div>
          <div className="t"><b className="text-muted">Riz sauce graine</b><small>1 500 F · Poisson</small></div>
          <span className="r text-ok">Servi</span>
        </div>
        <Link className="li gap-4 py-[18px] bg-tint" to="/student">
          <div className="d"><small className="text-marine">Mar</small><b className="text-marine">24</b></div>
          <div className="t"><b>Attiéké poisson braisé</b><small>1 500 F · Poisson</small></div>
          <span className="r text-marine">Aujourd'hui</span>
        </Link>
        <Link className="li gap-4 py-[18px]" to="/student/creneau">
          <div className="d"><small>Mer</small><b>25</b></div>
          <div className="t"><b>Alloco poulet braisé</b><small>1 750 F · Aucun allergène</small></div>
          <Chevron />
        </Link>
        <Link className="li gap-4 py-[18px]" to="/student/plat">
          <div className="d"><small>Jeu</small><b>26</b></div>
          <div className="t"><b>Foutou sauce arachide</b><small>1 500 F · Arachide</small></div>
          <span className="r text-danger flex items-center gap-1.5"><Icon name="alert" size={18} />Allergie</span>
        </Link>
        <a className="li gap-4 py-[18px]" href="#">
          <div className="d"><small>Ven</small><b>27</b></div>
          <div className="t"><b>Kédjénou de poulet, riz</b><small>1 750 F · Allergènes non vérifiés</small></div>
          <Chevron />
        </a>
      </div>
      <p className="mx-5 mt-4 text-[14px] leading-[21px] text-muted">Un plat par jour. Réservation possible jusqu'à 10 h 30 le jour même.</p>
    </div>
  );
}
