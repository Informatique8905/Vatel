import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import { SkeletonList, useFakeLoading } from '../../components/common/kbr';

const CHILDREN = [
  { ini: 'AK', name: 'Aya Konan', sub: 'Bachelor 2 · 2 repas restants', balance: '3 000 F', low: false },
  { ini: 'YK', name: 'Yao Konan', sub: 'Bachelor 1 · moins d’un repas', balance: '1 000 F', low: true },
];

// Maquette : parent-01-enfants
export default function ChildrenPage() {
  const loading = useFakeLoading(600);
  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink label="Compte" />
        <h1 className="h1 mt-[22px]">Mes enfants</h1>
        <p className="mt-1.5 text-[16px] text-muted">Famille Konan · 2 comptes</p>
      </div>

      <div role="status" className="mx-5 mt-[22px] px-4 py-3.5 rounded-[14px] bg-tint-yellow flex gap-3 items-center">
        <span className="text-ink"><Icon name="alert" sw={2.2} /></span>
        <span className="text-[15px] leading-[21px]"><b>Solde bas pour Yao.</b> 1 000 F, sous le seuil de 1 500 F.</span>
      </div>

      {loading ? (
        <div className="px-5 mt-[22px]"><SkeletonList rows={2} width="350" /></div>
      ) : (
      <div className="list mt-[22px]">
        {CHILDREN.map((c) => (
          <Link key={c.ini} className="li" to="/parent/repas">
            <span className="w-12 h-12 rounded-[24px] bg-tint text-marine flex items-center justify-center text-[17px] font-extrabold flex-none">{c.ini}</span>
            <div className="t"><b>{c.name}</b><small>{c.sub}</small></div>
            <span className={`amt num text-[18px] ${c.low ? 'text-danger' : 'text-ink'}`}>{c.balance}</span>
            <Icon name="chevronRight" size={20} className="text-muted" />
          </Link>
        ))}
      </div>
      )}

      <div className="px-5 pt-6"><Link className="primary" to="/parent/recharge"><Icon name="plus" />Recharger un compte</Link></div>

      <div className="px-5 pt-[30px] pb-2.5"><h2 className="h2">Aujourd’hui</h2></div>
      <div className="list">
        <div className="li py-3.5"><div className="t"><b>Aya · Attiéké poisson braisé</b><small>Réservé · 12:45 – 13:15</small></div><span className="amt num text-danger">−1 500 F</span></div>
        <div className="li py-3.5"><div className="t"><b>Yao · aucun repas réservé</b><small>Réservation possible jusqu’à 10 h 30</small></div></div>
      </div>
    </div>
  );
}
