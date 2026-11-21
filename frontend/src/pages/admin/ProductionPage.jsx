import { useMemo } from 'react';
import { useData } from '../../hooks/useData';
import { getSlots, getDistributions, getMenuItems, todayKey, fmtDay, slotText } from '../../services/cantine';

const LEGEND = [['#1E7F4F', 'Servi'], ['#072A5D', 'À servir'], ['#E3E3E3', 'Libre']];
const seg = (n, background) => (n === 0 ? { display: 'none' } : { display: 'block', height: '100%', flex: `${n} 0 0`, background });

// Admin-04 : écran cuisine temps réel — à servir par créneau, calculé
// depuis les distributions réelles (CONFIRMED vs COLLECTED).
export default function ProductionPage() {
  const today = todayKey();
  const { data: slots } = useData(() => getSlots(`?date=${today}`).then((d) => d.slots), [today]);
  const { data: rows } = useData(() => getDistributions(`?date=${today}`).then((d) => d.reservations).catch(() => []), [today]);
  const { data: items } = useData(() => getMenuItems(`?date=${today}`).then((d) => d.items), [today]);

  const perSlot = useMemo(() => (slots ?? []).map((s) => {
    const rs = (rows ?? []).filter((r) => r.timeSlot.id === s.id);
    const served = rs.filter((r) => r.status === 'COLLECTED').length;
    const waiting = rs.filter((r) => r.status === 'CONFIRMED').length;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const state = !s.isOpen && s.reservedCount === 0 ? 'Fermé'
      : nowMin >= s.endMinutes ? 'Terminé'
      : nowMin >= s.startMinutes ? 'En cours' : 'À venir';
    return { s, served, waiting, free: Math.max(0, s.capacity - served - waiting), state };
  }), [slots, rows]);

  const toServe = perSlot.reduce((sum, x) => sum + x.waiting, 0);
  const totalServed = perSlot.reduce((sum, x) => sum + x.served, 0);
  const totalReserved = perSlot.reduce((sum, x) => sum + x.served + x.waiting, 0);
  const totalCap = perSlot.reduce((sum, x) => sum + x.s.capacity, 0);
  const active = perSlot.find((x) => x.state === 'En cours');

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{fmtDay(today)} · écran cuisine</span><h1 className="h1">Production du jour</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          {active && (
            <span className="tag h-10 px-4 text-[15px] bg-ok-bg text-ok gap-2.5">
              <span className="w-2.5 h-2.5 rounded-[5px] bg-ok" />Service en cours · {active.s.label ?? slotText(active.s)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-1">
        <span className="text-[17px] font-semibold text-muted">À servir au total</span>
        <span className="num text-[120px] leading-[124px] font-black tracking-[-4.5px] text-marine">{toServe}</span>
        <span className="text-[16px] text-muted">{totalServed} déjà servis · {slots?.length ?? 0} créneau(x) aujourd’hui</span>
      </div>

      <div className="mt-9">
        <div className="stats">
          <div className="stat"><b className="num text-ink">{totalReserved}</b><span>réservés sur {totalCap}</span></div>
          <div className="stat"><b className="num text-ok">{totalServed}</b><span>servis</span></div>
          <div className="stat"><b className="num text-marine">{toServe}</b><span>à servir</span></div>
          <div className="stat"><b className="num text-ink">{Math.max(0, totalCap - totalReserved)}</b><span>portions libres</span></div>
        </div>
      </div>

      <div className="sec">
        <h2 className="h2">Par créneau</h2>
        <div className="flex gap-[18px] flex-wrap text-[14px] font-semibold text-muted">
          {LEGEND.map(([c, l]) => (
            <span key={l} className="flex items-center gap-2"><i className="w-3 h-3 rounded-[3px]" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </div>
      <div className="list">
        {perSlot.map(({ s, served, waiting, free, state }) => (
          <div key={s.id} className="li flex-wrap py-5">
            <div className="w-[160px]"><b className="num text-[20px] font-extrabold">{s.label ?? slotText(s)}</b><div className="text-[14px] text-muted">{state}</div></div>
            <div className="flex-1 min-w-[240px] flex h-4 rounded-[8px] overflow-hidden gap-0.5">
              <span style={seg(served, '#1E7F4F')} /><span style={seg(waiting, '#072A5D')} /><span style={seg(free, '#E3E3E3')} />
            </div>
            <span className="num w-[210px] text-right text-[15px] font-semibold text-muted">{served} servis · {waiting} à servir</span>
          </div>
        ))}
        {perSlot.length === 0 && <div className="li"><div className="t"><b>Aucun créneau aujourd’hui</b></div></div>}
      </div>

      <div className="sec"><h2 className="h2">Notes de service</h2></div>
      <div className="list">
        <div className="li"><div className="t"><b>Allergies : blocage automatique actif</b><small>Les élèves allergiques ne peuvent pas réserver un plat incompatibles avec leur profil.</small></div><span className="tag bg-ok-bg text-ok">OK</span></div>
        {(items ?? []).filter((i) => !i.dish.allergenInfoVerified).map((i) => (
          <div key={i.id} className="li"><div className="t"><b>{i.dish.name}</b><small>Informations allergènes non vérifiées par la cuisine.</small></div><span className="tag bg-tint-yellow text-ink">À vérifier</span></div>
        ))}
      </div>
    </>
  );
}
