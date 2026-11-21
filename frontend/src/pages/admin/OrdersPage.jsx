import { useMemo, useState } from 'react';
import Icon from '../../components/common/Icon';
import { ExpandingSearch, SkeletonList, AppButton, RollText, toastBus } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import { getSlots, getDistributions, todayKey, fmtDay, slotText, manualCollect, apiMessage } from '../../services/cantine';

const STATUS = { COLLECTED: 'Servi', CONFIRMED: 'Attendu' };
const STATUS_COLOR = { Servi: 'text-ok', Attendu: 'text-marine' };

// Admin-03 : commandes du jour par créneau. La liste vient de
// /distributions (noms élèves + statut temps réel CONFIRMED/COLLECTED).
export default function OrdersPage() {
  const today = todayKey();
  const { data: slots } = useData(() => getSlots(`?date=${today}`).then((d) => d.slots), [today]);
  const { data: rows, loading, reload } = useData(
    () => getDistributions(`?date=${today}`).then((d) => d.reservations).catch(() => []),
    [today],
  );

  const [sel, setSel] = useState(0);
  const [q, setQ] = useState('');
  const slotList = slots ?? [];
  const cur = slotList[Math.min(sel, Math.max(0, slotList.length - 1))];

  const slotRows = useMemo(
    () => (rows ?? []).filter((r) => !cur || r.timeSlot.id === cur.id),
    [rows, cur],
  );
  const shown = q
    ? slotRows.filter((r) => r.student.name.toLowerCase().includes(q.toLowerCase()))
    : slotRows;
  const served = slotRows.filter((r) => r.status === 'COLLECTED').length;
  const wait = slotRows.filter((r) => r.status === 'CONFIRMED').length;

  const collect = async (r) => {
    try {
      await manualCollect(r.reservationId);
      toastBus.show(`${r.student.name} · repas remis`);
      reload();
    } catch (err) { toastBus.show(apiMessage(err)); }
  };

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{fmtDay(today)}</span><h1 className="h1">Commandes du jour</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <ExpandingSearch
            placeholder="Rechercher un élève"
            items={(rows ?? []).map((r) => r.student.name)}
            none-label="Aucun résultat"
            width="300"
            onSelect={(v) => setQ(typeof v === 'string' ? v : v?.label ?? '')}
          />
          <AppButton label="Imprimer" busyLabel="Impression…" doneLabel="Liste prête" className="btn s" onDone={() => window.print()} />
        </div>
      </div>

      {slotList.length === 0 ? (
        <p className="mt-10 text-[16px] font-semibold text-muted">Aucun créneau aujourd’hui.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Créneaux" className="flex bg-track rounded-[14px] p-1 mt-9 max-w-[720px] overflow-x-auto">
            {slotList.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === sel}
                onClick={() => setSel(i)}
                className={`flex-1 min-w-[110px] h-[58px] rounded-[11px] cursor-pointer flex flex-col items-center justify-center gap-0.5 text-ink ${i === sel ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'bg-transparent'}`}
              >
                <span className="num text-[15px] font-extrabold whitespace-nowrap">{s.label ?? slotText(s)}</span>
                <span className="text-[13px] font-semibold text-muted">{s.isOpen ? 'Ouvert' : 'Fermé'} · {s.reservedCount}/{s.capacity}</span>
              </button>
            ))}
          </div>

          <div className="flex items-baseline gap-3.5 mt-9 flex-wrap">
            <RollText className="num text-[72px] leading-[76px] font-black tracking-[-2.5px]" text={String(cur?.reservedCount ?? 0)} />
            <span className="num text-[22px] font-bold text-muted">réservations · {cur?.label ?? ''}</span>
          </div>
          <div className="stats mt-[18px]">
            <div className="stat"><b className="num"><RollText text={String(served)} /></b><span>servis</span></div>
            <div className="stat"><b className="num"><RollText text={String(wait)} /></b><span>attendus</span></div>
          </div>

          {loading ? (
            <div className="mt-9"><SkeletonList rows={6} width="720" avatars={false} /></div>
          ) : (
            <div className="list mt-9 overflow-x-auto">
              <div className="li text-[13px] font-bold text-muted uppercase tracking-[0.4px] min-w-[720px] box-content">
                <span className="flex-[2]">Élève</span><span className="flex-[1.5]">Plat</span><span className="flex-1">Référence</span><span className="w-[170px] text-right">Statut</span>
              </div>
              {shown.map((r) => (
                <div key={r.reservationId} className="li min-w-[720px] box-content">
                  <b className="flex-[2] font-bold">{r.student.name}</b>
                  <span className="flex-[1.5] text-muted whitespace-nowrap overflow-hidden text-ellipsis">{r.menuItem.dish}</span>
                  <span className="num flex-1 font-mono text-marine font-bold">{r.reservationId.slice(-6).toUpperCase()}</span>
                  {r.status === 'CONFIRMED' ? (
                    <button type="button" onClick={() => collect(r)} className="w-[170px] text-right text-[15px] font-bold text-marine cursor-pointer bg-transparent border-0 underline">
                      Marquer servi
                    </button>
                  ) : (
                    <span className="w-[170px] text-right text-[15px] font-bold text-ok">Servi{r.distribution?.method === 'MANUAL' ? ' · manuel' : ''}</span>
                  )}
                </div>
              ))}
              {shown.length === 0 && <div className="li"><div className="t"><b>Aucune réservation sur ce créneau</b></div></div>}
            </div>
          )}
        </>
      )}
    </>
  );
}
