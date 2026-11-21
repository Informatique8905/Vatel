import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AvatarLink from '../../components/common/AvatarLink';
import { VatelSegmented, RollText } from '../../components/common/kbr';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getChildren, getReservations, fmtDayShort, slotText, RESERVATION_STATUS, statusColor } from '../../services/cantine';
import { formatF } from '../../utils/format';

// Parent-03 : suivi des repas d'un enfant lié. Les réservations sont
// filtrées côté serveur par le lien APPROVED (studentId requis).
export default function MealsPage() {
  const [params] = useSearchParams();
  const { data } = useData(() => getChildren(), []);
  const children = data?.children ?? [];
  const [kid, setKid] = useState(null);
  const child = children.find((c) => c.studentId === (kid ?? params.get('enfant'))) ?? children[0];

  const { data: reservations, loading } = useData(
    () => (child ? getReservations(`?studentId=${child.studentId}&pageSize=50`).then((d) => d.reservations) : Promise.resolve([])),
    [child?.studentId],
  );

  const stats = useMemo(() => {
    const list = reservations ?? [];
    return [
      [String(list.filter((r) => r.status === 'COLLECTED').length), 'servis', '#1D1D1B'],
      [String(list.filter((r) => r.status === 'NOT_COLLECTED').length), 'non récupéré', '#B42318'],
      [formatF(list.filter((r) => ['COLLECTED', 'CONFIRMED', 'NOT_COLLECTED'].includes(r.status)).reduce((s, r) => s + r.priceSnapshot, 0)), 'dépensés', '#1D1D1B'],
    ];
  }, [reservations]);

  const options = children.map((c) => ({ id: c.studentId, label: c.name.split(' ')[0] }));

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink to="/parent/compte" label="Compte" />
        <h1 className="h1 mt-[22px]">Repas</h1>
        {options.length > 0 && <div className="mt-4"><VatelSegmented options={options} value={child?.studentId} onChange={setKid} label="Enfant" /></div>}
      </div>

      {children.length === 0 ? (
        <p className="px-8 pt-16 text-center text-[16px] font-semibold text-muted">Aucun enfant lié — liez un compte élève pour suivre ses repas.</p>
      ) : loading ? (
        <PageLoader />
      ) : (
        <>
          <div className="flex px-5 pt-6">
            {stats.map(([v, l, color], i) => (
              <div key={l} className={`flex-[1_1_auto] flex flex-col gap-0.5 ${i > 0 ? 'pl-4 border-l border-line ml-4' : ''}`}>
                <RollText className="num text-[24px] leading-[30px] font-black tracking-[-0.6px] whitespace-nowrap" style={{ color }} text={v} />
                <span className="text-[13px] font-semibold text-muted">{l}</span>
              </div>
            ))}
          </div>

          <div className="px-5 pt-7 pb-2.5 flex justify-between items-baseline">
            <h2 className="h2">Historique</h2>
            <span className="text-[14px] font-bold text-muted">{(reservations ?? []).length} réservation{(reservations ?? []).length > 1 ? 's' : ''}</span>
          </div>
          <div className="list">
            {(reservations ?? []).map((r) => (
              <div key={r.id} className="li py-3.5">
                <div className="t"><b>{r.menuItem.dish.name}</b><small>{fmtDayShort(r.menuItem.date)} · {slotText(r.timeSlot)}</small></div>
                <span className="text-[14px] font-bold whitespace-nowrap" style={{ color: statusColor(r.status) }}>{RESERVATION_STATUS[r.status] ?? r.status}</span>
              </div>
            ))}
            {(reservations ?? []).length === 0 && (
              <div className="li"><div className="t"><b>Aucune réservation</b><small>Votre enfant n’a pas encore réservé de repas</small></div></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
