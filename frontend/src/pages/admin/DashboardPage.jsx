import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { RollText } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import {
  getMenuItems, getSlots, getDistributions, getCanteen,
  todayKey, fmtDay, fmtDayShort, slotText,
} from '../../services/cantine';
import { formatF } from '../../utils/format';

// Admin-01 : tableau de bord temps réel — offres du jour, créneaux,
// distribution et caisse cantine (ledger).
export default function DashboardPage() {
  const today = todayKey();
  const { data: items } = useData(() => getMenuItems(`?date=${today}`).then((d) => d.items), [today]);
  const { data: slots } = useData(() => getSlots(`?date=${today}`).then((d) => d.slots), [today]);
  const { data: dist } = useData(() => getDistributions(`?date=${today}`).then((d) => d.reservations).catch(() => []), [today]);
  const { data: canteen } = useData(() => getCanteen().catch(() => null), []);

  const list = items ?? [];
  const totalQty = list.reduce((s, i) => s + i.quantity, 0);
  const totalReserved = list.reduce((s, i) => s + (i.quantity - i.remaining), 0);
  const served = (dist ?? []).filter((r) => r.status === 'COLLECTED').length;
  const waiting = (dist ?? []).filter((r) => r.status === 'CONFIRMED').length;
  const revenue = (dist ?? []).filter((r) => r.status === 'COLLECTED')
    .reduce((s, r) => s + (items ?? []).find((i) => i.id === r.menuItem.id)?.price || s, 0);
  const pct = totalQty ? Math.round((totalReserved / totalQty) * 100) : 0;
  const main = list[0];

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{fmtDay(today)}</span><h1 className="h1">Tableau de bord</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <Link className="btn s" to="/admin/menus">Menus</Link>
          <Link className="btn p" to="/admin/scan"><Icon name="qr" />Ouvrir le scan</Link>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-1.5">
        <span className="text-[17px] font-semibold text-muted">
          Réservations aujourd’hui{main ? ` · ${main.dish.name}` : ' · aucune offre'}
        </span>
        <div className="flex items-baseline gap-3.5 flex-wrap">
          <RollText className="num text-[104px] leading-[108px] font-black tracking-[-4px]" text={String(totalReserved)} />
          <span className="num text-[28px] font-extrabold text-muted tracking-[-0.5px]">sur {totalQty} portions</span>
        </div>
        <div className="h-2 rounded-[4px] bg-track max-w-[640px] mt-2.5 overflow-hidden">
          <div className="grow h-full bg-marine rounded-[4px]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[15px] text-muted mt-1.5">{pct} % de la capacité · {totalQty - totalReserved} portions encore libres</span>
      </div>

      <div className="mt-10">
        <div className="stats">
          <div className="stat"><b className="num text-ok">{served}</b><span>servis</span></div>
          <div className="stat"><b className="num text-marine">{waiting}</b><span>à servir</span></div>
          <div className="stat"><b className="num text-ink">{formatF(canteen?.canteen?.balance ?? 0)}</b><span>caisse cantine</span></div>
          <div className="stat"><b className="num text-ink">{formatF(canteen?.studentWallets?.totalBalance ?? 0)}</b><span>passif élèves</span></div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-10 mt-2">
        <div>
          <div className="sec"><h2 className="h2">Créneaux</h2><Link to="/admin/commandes" className="text-[15px] font-bold no-underline">Voir les commandes</Link></div>
          <div className="list">
            {(slots ?? []).map((s) => (
              <div key={s.id} className="li">
                <b className="num w-28 font-extrabold">{s.label ?? slotText(s)}</b>
                <span className="flex-1 h-2 rounded-[4px] bg-track overflow-hidden block">
                  <span className="grow block h-full rounded-[4px]" style={{ width: `${Math.round((s.reservedCount / s.capacity) * 100)}%`, background: s.reservedCount >= s.capacity ? '#072A5D' : '#67B2E8' }} />
                </span>
                <span className="num w-[150px] text-right text-[15px] font-semibold text-muted">{s.reservedCount} / {s.capacity}{s.reservedCount >= s.capacity ? ' · complet' : ''}</span>
              </div>
            ))}
            {slots && slots.length === 0 && <div className="li"><div className="t"><b>Aucun créneau aujourd’hui</b><small>Créez-en un depuis la page Menus</small></div></div>}
          </div>
        </div>
        <div>
          <div className="sec"><h2 className="h2">Offres du jour</h2><span className="text-[15px] text-muted">réservé / quantité</span></div>
          <div className="list">
            {list.map((i) => (
              <div key={i.id} className="li">
                <span className="w-24 text-[14px] font-bold text-muted">{fmtDayShort(i.date)}</span>
                <span className="flex-1 min-w-0 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{i.dish.name}</span>
                <b className="num w-20 text-right font-extrabold">{i.quantity - i.remaining}</b>
              </div>
            ))}
            {list.length === 0 && <div className="li"><div className="t"><b>Aucune offre</b><small>Publiez un menu pour aujourd’hui</small></div></div>}
          </div>
        </div>
      </div>

      <div className="sec"><h2 className="h2">À traiter</h2><span className="text-[15px] text-muted">informations allergènes</span></div>
      <div className="list">
        {list.filter((i) => !i.dish.allergenInfoVerified).map((i) => (
          <Link key={i.id} className="li" to="/admin/menus">
            <span className="tag bg-tint-yellow text-ink">Non vérifié</span>
            <div className="t"><b>{i.dish.name} · {fmtDayShort(i.date)}</b><small>Allergènes non vérifiés : les élèves voient « informations non vérifiées ».</small></div>
            <Icon name="chevronRight" className="text-muted" />
          </Link>
        ))}
        {list.every((i) => i.dish.allergenInfoVerified) && (
          <div className="li"><div className="t"><b>Rien à signaler</b><small>Toutes les fiches allergènes du jour sont vérifiées</small></div><span className="tag bg-ok-bg text-ok">OK</span></div>
        )}
      </div>
    </>
  );
}
