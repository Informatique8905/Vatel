import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import DishOrbitCarousel from '../../components/common/DishOrbitCarousel';
import { WEEK_MENU, WEEK_LABEL, MENU_DAYS } from '../../data/weekMenu';

// Maquette : eleve-03-semaine — carrousel « Dish Orbit » pleine hauteur,
// piloté par la molette et le glisser (aucun scroll de page), filtrable
// par jour quand plusieurs plats sont proposés le même jour.
export default function WeekMenuPage() {
  const navigate = useNavigate();
  const [day, setDay] = useState('all');
  // Extras cochés par plat : conservés quand on change de jour (le carrousel
  // est remonté par le filtre, l'état vit ici).
  const [picked, setPicked] = useState({});
  const toggleExtra = (dkey, key) => {
    setPicked((s) => {
      const cur = s[dkey] || [];
      return { ...s, [dkey]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  };
  const todayIdx = Math.max(0, WEEK_MENU.findIndex((d) => d.status === 'today'));
  const dishes = day === 'all' ? WEEK_MENU : WEEK_MENU.filter((d) => d.dayKey === day);
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

      <div className="flex-none px-5 mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filtrer les plats par jour">
        {MENU_DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={day === d.key}
            className={`flex-none h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${day === d.key ? 'bg-marine border-marine text-white' : 'bg-white border-line text-muted'}`}
            onClick={() => setDay(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 mt-1">
        <DishOrbitCarousel
          key={day}
          dishes={dishes}
          initialIndex={day === 'all' ? todayIdx : 0}
          height="100%"
          drive="gesture"
          picked={picked}
          onToggleExtra={toggleExtra}
          onOrder={() => navigate('/student/creneau')}
          onReport={() => navigate('/student/plat')}
        />
      </div>
    </div>
  );
}
