import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import DishOrbitCarousel from '../../components/common/DishOrbitCarousel';
import DishPlate from '../../components/common/DishPlate';
import { WEEK_MENU, WEEK_LABEL } from '../../data/weekMenu';

const Chevron = () => <Icon name="chevronRight" size={20} className="text-muted" />;

function DayRow({ d }) {
  const thumb = <DishPlate dish={d} size={46} />;
  const day = (
    <div className="d">
      <small className={d.status === 'today' ? 'text-marine' : ''}>{d.day}</small>
      <b className={d.status === 'today' ? 'text-marine' : ''}>{d.date}</b>
    </div>
  );
  const text = (
    <div className="t">
      <b className={d.status === 'served' ? 'text-muted' : ''}>{d.name}</b>
      <small>{d.meta}</small>
    </div>
  );

  if (d.status === 'served') {
    return <div className="li gap-4 py-[16px] text-muted">{day}{thumb}{text}<span className="r text-ok">{d.statusLabel}</span></div>;
  }
  if (d.allergen) {
    return (
      <Link className="li gap-4 py-[16px]" to="/student/plat">
        {day}{thumb}{text}
        <span className="r text-danger flex items-center gap-1.5"><Icon name="alert" size={18} />Allergie</span>
      </Link>
    );
  }
  const to = d.status === 'today' ? '/student' : '/student/creneau';
  return (
    <Link className={`li gap-4 py-[16px]${d.status === 'today' ? ' bg-tint' : ''}`} to={to}>
      {day}{thumb}{text}
      {d.status === 'today' ? <span className="r text-marine">{d.statusLabel}</span> : <Chevron />}
    </Link>
  );
}

// Maquette : eleve-03-semaine — refonte carrousel « Dish Orbit »
export default function WeekMenuPage() {
  const navigate = useNavigate();
  const todayIdx = Math.max(0, WEEK_MENU.findIndex((d) => d.status === 'today'));
  return (
    <div>
      <div className="px-5 pt-[52px] flex items-end justify-between">
        <div>
          <AvatarLink to="/student/profil" label="Profil" />
          <h1 className="mt-[18px] text-[34px] leading-[40px] font-black tracking-[-1px]">Menu</h1>
          <p className="mt-1.5 mb-0 text-[16px] text-muted">{WEEK_LABEL}</p>
        </div>
        <div className="flex gap-1 pb-1">
          <button type="button" aria-label="Semaine précédente" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronLeft" /></button>
          <button type="button" aria-label="Semaine suivante" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronRight" /></button>
        </div>
      </div>
      <p className="mx-5 mt-2 mb-0 text-[13px] text-muted">Faites défiler ou balayez l’assiette pour découvrir les plats.</p>

      <div className="mt-2">
        <DishOrbitCarousel
          dishes={WEEK_MENU}
          initialIndex={todayIdx}
          height="calc(100svh - 86px)"
          onOrder={() => navigate('/student/creneau')}
          onReport={() => navigate('/student/plat')}
        />
      </div>

      <div className="px-5 pt-7 pb-3 flex justify-between items-baseline">
        <h2 className="h2">La semaine en résumé</h2>
      </div>
      <div className="list">
        {WEEK_MENU.map((d) => <DayRow key={d.key} d={d} />)}
      </div>
      <p className="mx-5 mt-4 text-[14px] leading-[21px] text-muted">Un plat par jour. Réservation possible jusqu’à 10 h 30 le jour même.</p>
    </div>
  );
}
