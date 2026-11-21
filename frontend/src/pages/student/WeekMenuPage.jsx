import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import DishOrbitCarousel from '../../components/common/DishOrbitCarousel';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getMenuItems, todayKey, fmtDayShort } from '../../services/cantine';
import { formatF } from '../../utils/format';

const DAY_KEYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const ACCENTS = ['#072A5D', '#0B3D91', '#1E7F4F', '#B42318', '#5C5C5C'];

// Offre datée -> plat du carrousel (mêmes champs que la maquette).
const toDish = (item, i) => {
  const d = new Date(`${item.date.slice(0, 10)}T00:00:00`);
  const today = item.date.slice(0, 10) === todayKey();
  return {
    id: item.id,
    menuItemId: item.id,
    dayKey: DAY_KEYS[d.getDay()],
    date: item.date.slice(0, 10),
    eyebrow: `${fmtDayShort(item.date.slice(0, 10))}${today ? ' · aujourd’hui' : ''}`,
    title: item.dish.name,
    subtitle: `${item.remaining > 0 ? `${item.remaining} places` : 'Complet'} · ${item.dish.allergenInfoVerified ? 'allergènes vérifiés' : 'infos non vérifiées'}`,
    priceXof: item.price,
    photoUrl: item.dish.photoUrl,
    description: item.dish.description ?? '',
    ingredients: (item.dish.ingredients ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    allergen: item.allergenAlert ? item.matchedAllergens.map((a) => a.name).join(', ') : null,
    warn: item.dish.crossContaminationNote ?? (!item.dish.allergenInfoVerified ? 'Informations allergènes non vérifiées par la cuisine.' : null),
    allergens: item.dish.allergens.map((a) => a.name),
    accent: ACCENTS[i % ACCENTS.length],
    status: today ? 'today' : 'published',
    statusLabel: today ? 'Aujourd’hui' : 'Publié',
    soldOut: item.remaining <= 0,
  };
};

// Menu : carrousel « Dish Orbit » alimenté par les offres PUBLISHED réelles.
export default function WeekMenuPage() {
  const navigate = useNavigate();
  const { data: items, loading } = useData(() => getMenuItems().then((d) => d.items), []);
  const dishes = useMemo(() => (items ?? []).map(toDish), [items]);

  const days = useMemo(() => {
    const keys = [...new Set(dishes.map((d) => d.dayKey))];
    const labels = { lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim' };
    return [{ key: 'all', label: 'Tous' }, ...keys.map((k) => ({ key: k, label: labels[k] ?? k }))];
  }, [dishes]);

  const [day, setDay] = useState('all');
  const shown = day === 'all' ? dishes : dishes.filter((d) => d.dayKey === day);
  const todayIdx = Math.max(0, shown.findIndex((d) => d.status === 'today'));

  return (
    <div className="flex flex-col h-[calc(100dvh-86px)] overflow-hidden">
      <div className="px-5 pt-[52px] flex-none">
        <AvatarLink to="/student/profil" label="Profil" />
        <div className="mt-[22px] flex items-end justify-between">
          <div>
            <h1 className="text-[34px] leading-[40px] font-black tracking-[-1px]">Menu</h1>
            <p className="mt-1 mb-0 text-[14px] text-muted whitespace-nowrap">
              {dishes.length ? `${dishes.length} plat${dishes.length > 1 ? 's' : ''} proposé${dishes.length > 1 ? 's' : ''}` : 'Aucune offre publiée'}
            </p>
          </div>
        </div>
      </div>

      {days.length > 2 && (
        <div className="flex-none px-5 mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filtrer les plats par jour">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={day === d.key}
              className={`flex-none h-9 px-3.5 rounded-full border text-[13px] font-bold transition active:scale-95 ${day === d.key ? 'bg-marine border-marine text-white' : 'bg-white border-line text-muted'}`}
              onClick={() => setDay(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 mt-1">
        {loading ? (
          <PageLoader />
        ) : shown.length === 0 ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-[16px] font-semibold text-muted">
            Aucun plat publié pour l’instant — la cuisine prépare le menu.
          </div>
        ) : (
          <DishOrbitCarousel
            key={day}
            dishes={shown}
            initialIndex={day === 'all' ? todayIdx : 0}
            height="100%"
            drive="gesture"
            onOrder={(dish) => !dish.soldOut && !dish.allergen && navigate(`/student/creneau?item=${dish.menuItemId}`)}
          />
        )}
      </div>
    </div>
  );
}
