import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import DishOrbitCarousel from '../../components/common/DishOrbitCarousel';
import { WEEK_MENU, WEEK_LABEL } from '../../data/weekMenu';

// Maquette : eleve-03-semaine — carrousel « Dish Orbit » pleine hauteur,
// piloté par la molette et le glisser (aucun scroll de page).
export default function WeekMenuPage() {
  const navigate = useNavigate();
  const todayIdx = Math.max(0, WEEK_MENU.findIndex((d) => d.status === 'today'));
  return (
    <div className="flex flex-col h-[calc(100dvh-86px)] overflow-hidden">
      <div className="px-5 pt-[52px] flex-none">
        <AvatarLink to="/student/profil" label="Profil" />
        <div className="mt-[22px] flex items-end justify-between">
          <div>
            <h1 className="text-[34px] leading-[40px] font-black tracking-[-1px]">Menu</h1>
            <p className="mt-1 mb-0 text-[14px] text-muted whitespace-nowrap">{WEEK_LABEL}</p>
          </div>
          <div className="flex gap-1 pb-1">
            <button type="button" aria-label="Semaine précédente" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronLeft" /></button>
            <button type="button" aria-label="Semaine suivante" className="w-11 h-11 bg-transparent text-marine flex items-center justify-center"><Icon name="chevronRight" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-1">
        <DishOrbitCarousel
          dishes={WEEK_MENU}
          initialIndex={todayIdx}
          height="100%"
          drive="gesture"
          onOrder={() => navigate('/student/creneau')}
          onReport={() => navigate('/student/plat')}
        />
      </div>
    </div>
  );
}
