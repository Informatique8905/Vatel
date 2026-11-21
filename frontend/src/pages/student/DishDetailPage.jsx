import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import BackLink from '../../components/common/BackLink';
import { AccordionList } from '../../components/common/kbr';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getMenuItem, fmtDay } from '../../services/cantine';
import { formatF } from '../../utils/format';

// Fiche plat : données réelles de l'offre (GET /menus/items/:id).
// Le blocage allergène est déterminé côté serveur (allergenAlert).
export default function DishDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useData(() => getMenuItem(id).then((d) => d.item), [id]);
  const item = data;

  if (loading) return <div className="flex flex-1"><BackLink to="/student/menu" /><PageLoader /></div>;
  if (error || !item) {
    return (
      <div className="flex flex-1 flex-col">
        <BackLink to="/student/menu" />
        <p className="px-5 pt-10 text-center text-[16px] font-semibold text-muted">Offre introuvable ou plus publiée.</p>
      </div>
    );
  }

  const { dish } = item;
  const blocked = item.allergenAlert;
  const soldOut = item.remaining <= 0;
  const ingredients = (dish.ingredients ?? '').split(',').map((s) => s.trim()).filter(Boolean).join(', ');

  return (
    <div className="flex flex-1 flex-col">
      <BackLink to="/student/menu" />

      <div className="flex flex-col items-center px-5 pt-1.5 text-center">
        <div className="w-[150px] h-[150px] rounded-[75px] bg-tint flex items-center justify-center overflow-hidden">
          {dish.photoUrl
            ? <img src={dish.photoUrl} alt={dish.name} className="w-full h-full object-cover" />
            : <span className="w-24 h-24 rounded-[48px] border-2 border-vatel bg-white box-content" />}
        </div>
        <span className="text-[15px] font-semibold text-muted mt-[18px] capitalize">{fmtDay(item.date)}</span>
        <h1 className="mt-1.5 text-[30px] leading-[36px] font-black tracking-[-0.8px]">{dish.name}</h1>
        <span className="num text-[20px] font-extrabold text-marine mt-2">{formatF(item.price)}</span>
        <span className="text-[14px] font-semibold text-muted mt-1">
          {soldOut ? 'Complet' : `${item.remaining} place${item.remaining > 1 ? 's' : ''} restante${item.remaining > 1 ? 's' : ''}`}
        </span>
      </div>

      {blocked && (
        <div role="alert" className="mx-5 mt-[26px] p-4 rounded-[14px] bg-danger-bg flex gap-3 items-start">
          <span className="text-danger"><Icon name="alert" sw={2.2} /></span>
          <div>
            <b className="text-[16px] text-danger">Contient {item.matchedAllergens.map((a) => `de la ${a.name}`).join(', ')}</b>
            <div className="text-[15px] leading-[22px] mt-0.5">Allergie déclarée dans votre profil. La réservation est bloquée.</div>
          </div>
        </div>
      )}
      {!dish.allergenInfoVerified && !blocked && (
        <div role="status" className="mx-5 mt-[26px] p-4 rounded-[14px] bg-tint-yellow flex gap-3 items-start">
          <span className="text-ink"><Icon name="alert" sw={2.2} /></span>
          <div className="text-[15px] leading-[22px]"><b>Informations non vérifiées.</b> La composition allergène de ce plat n’a pas encore été confirmée par la cuisine.</div>
        </div>
      )}

      <div className="mt-[22px] px-5">
        <AccordionList
          q-1="Composition"
          a-1={ingredients || 'Non renseignée'}
          q-2="Allergènes déclarés"
          a-2={dish.allergens.length ? dish.allergens.map((a) => a.name).join(', ') : 'Aucun déclaré par la cuisine.'}
          q-3="Contamination croisée"
          a-3={dish.crossContaminationNote ?? 'Aucune note de la cuisine.'}
          width="350"
          start-open="1"
        />
      </div>

      <div className="mt-auto px-5 pb-[34px] flex flex-col gap-3.5">
        {blocked || soldOut ? (
          <button type="button" disabled className="h-[58px] rounded-[14px] bg-line text-muted text-[17px] font-bold">
            {blocked ? 'Réservation indisponible' : 'Complet'}
          </button>
        ) : (
          <button type="button" onClick={() => navigate(`/student/creneau?item=${item.id}`)} className="h-[58px] rounded-[14px] bg-marine text-white text-[17px] font-bold cursor-pointer">
            Réserver · {formatF(item.price)}
          </button>
        )}
      </div>
    </div>
  );
}
