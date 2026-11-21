const SLOTS = [
  ['11:45', 'Terminé', 64, 0, 4, 70],
  ['12:15', 'Terminé', 65, 0, 5, 70],
  ['12:45', 'En cours', 39, 13, 0, 70],
  ['13:15', 'À venir', 0, 24, 0, 50],
];
const LEGEND = [['#1E7F4F', 'Servi'], ['#072A5D', 'À servir'], ['#FF5959', 'Non récupéré'], ['#E3E3E3', 'Libre']];

const seg = (n, background) => (n === 0 ? { display: 'none' } : { display: 'block', height: '100%', flex: `${n} 0 0`, background });

// Maquette : admin-04-production
export default function ProductionPage() {
  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Mardi 24 · 13:00 · écran cuisine</span><h1 className="h1">Production du jour</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <span className="tag h-10 px-4 text-[15px] bg-ok-bg text-ok gap-2.5"><span className="w-2.5 h-2.5 rounded-[5px] bg-ok" />Service en cours · 12:45</span>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-1">
        <span className="text-[17px] font-semibold text-muted">À servir maintenant et à 13:15</span>
        <span className="num text-[120px] leading-[124px] font-black tracking-[-4.5px] text-marine">37</span>
        <span className="text-[16px] text-muted">13 au créneau en cours · 24 au créneau de 13:15</span>
      </div>

      <div className="mt-9">
        <div className="stats">
          <div className="stat"><b className="num text-ink">214</b><span>réservés sur 260</span></div>
          <div className="stat"><b className="num text-ok">168</b><span>servis</span></div>
          <div className="stat"><b className="num text-danger">9</b><span>non récupérés</span></div>
          <div className="stat"><b className="num text-ink">46</b><span>portions libres</span></div>
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
        {SLOTS.map(([l, state, sv, w, m, cap]) => (
          <div key={l} className="li flex-wrap py-5">
            <div className="w-[120px]"><b className="num text-[20px] font-extrabold">{l}</b><div className="text-[14px] text-muted">{state}</div></div>
            <div className="flex-1 min-w-[240px] flex h-4 rounded-[8px] overflow-hidden gap-0.5">
              <span style={seg(sv, '#1E7F4F')} /><span style={seg(w, '#072A5D')} /><span style={seg(m, '#FF5959')} /><span style={seg(cap - sv - w - m, '#E3E3E3')} />
            </div>
            <span className="num w-[230px] text-right text-[15px] font-semibold text-muted">{sv} servis · {w} à servir · {m} NR</span>
          </div>
        ))}
      </div>

      <div className="sec"><h2 className="h2">Notes de service</h2></div>
      <div className="list">
        <div className="li"><div className="t"><b>Allergies : aucun conflit</b><small>Les élèves allergiques au poisson n’ont pas pu réserver ce plat.</small></div><span className="tag bg-ok-bg text-ok">OK</span></div>
        <div className="li"><div className="t"><b>Demain : alloco poulet braisé</b><small>131 réservations à 13:00 · clôture à 10 h 30.</small></div><b className="num text-[20px] font-extrabold">131</b></div>
      </div>
    </>
  );
}
