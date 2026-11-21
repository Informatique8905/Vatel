import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import { SkeletonList } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import { getChildren, getReservations, todayKey, slotText, RESERVATION_STATUS, statusColor } from '../../services/cantine';
import { formatF } from '../../utils/format';

const LOW = 1500; // seuil affichage « solde bas » (1 repas)

const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Parent-01 : liste réelle des enfants liés (GET /parents/children),
// soldes wallets et repas du jour par enfant (réservations portée parent).
export default function ChildrenPage() {
  const { data, loading } = useData(() => getChildren(), []);
  const children = data?.children ?? [];

  const { data: todayRows } = useData(async () => {
    const rows = await Promise.all(children.map((c) =>
      getReservations(`?studentId=${c.studentId}&date=${todayKey()}&pageSize=5`)
        .then((d) => ({ child: c, list: d.reservations ?? [] }))
        .catch(() => ({ child: c, list: [] }))));
    return rows;
  }, [children.map((c) => c.studentId).join(',')]);

  const lowKids = children.filter((c) => c.balance < LOW);

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink label="Compte" />
        <h1 className="h1 mt-[22px]">Mes enfants</h1>
        <p className="mt-1.5 text-[16px] text-muted">{children.length ? `${children.length} compte${children.length > 1 ? 's' : ''} lié${children.length > 1 ? 's' : ''}` : 'Aucun enfant lié pour l’instant'}</p>
      </div>

      {lowKids.length > 0 && (
        <div role="status" className="mx-5 mt-[22px] px-4 py-3.5 rounded-[14px] bg-tint-yellow flex gap-3 items-center">
          <span className="text-ink"><Icon name="alert" sw={2.2} /></span>
          <span className="text-[15px] leading-[21px]"><b>Solde bas pour {lowKids.map((k) => k.name.split(' ')[0]).join(', ')}.</b> Pensez à recharger.</span>
        </div>
      )}

      {loading ? (
        <div className="px-5 mt-[22px]"><SkeletonList rows={2} width="350" /></div>
      ) : (
      <div className="list mt-[22px]">
        {children.map((c) => (
          <Link key={c.studentId} className="li" to={`/parent/repas?enfant=${c.studentId}`}>
            <span className="w-12 h-12 rounded-[24px] bg-tint text-marine flex items-center justify-center text-[17px] font-extrabold flex-none">{initials(c.name)}</span>
            <div className="t"><b>{c.name}</b><small>{[c.grade, c.kind === 'EMPLOYEE' ? 'Employé' : null].filter(Boolean).join(' · ') || 'Cantine Vatel'}</small></div>
            <span className={`amt num text-[18px] ${c.balance < LOW ? 'text-danger' : 'text-ink'}`}>{formatF(c.balance)}</span>
            <Icon name="chevronRight" size={20} className="text-muted" />
          </Link>
        ))}
        {children.length === 0 && (
          <div className="li"><div className="t"><b>Aucun enfant lié</b><small>Partagez une invitation depuis votre profil ou scannez le QR de votre enfant</small></div></div>
        )}
      </div>
      )}

      <div className="px-5 pt-6"><Link className="primary" to="/parent/recharge"><Icon name="plus" />Recharger un compte</Link></div>

      <div className="px-5 pt-[30px] pb-2.5"><h2 className="h2">Aujourd’hui</h2></div>
      <div className="list">
        {(todayRows ?? []).flatMap(({ child, list }) =>
          list.length === 0
            ? [<div key={child.studentId} className="li py-3.5"><div className="t"><b>{child.name.split(' ')[0]} · aucun repas réservé</b><small>Pas de réservation aujourd’hui</small></div></div>]
            : list.map((r) => (
              <div key={r.id} className="li py-3.5">
                <div className="t"><b>{child.name.split(' ')[0]} · {r.menuItem.dish.name}</b><small>{RESERVATION_STATUS[r.status] ?? r.status} · {slotText(r.timeSlot)}</small></div>
                <span className="amt num text-danger">−{formatF(r.priceSnapshot)}</span>
              </div>
            )))}
        {todayRows === null || todayRows === undefined ? <div className="px-5"><SkeletonList rows={1} width="350" /></div> : null}
      </div>
    </div>
  );
}
