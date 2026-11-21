import { useState } from 'react';
import Icon from '../../components/common/Icon';

const SLOTS = [
  { l: '11:45', total: 68, served: 64, wait: 0, miss: 4, state: 'Terminé' },
  { l: '12:15', total: 70, served: 65, wait: 0, miss: 5, state: 'Terminé' },
  { l: '12:45', total: 52, served: 39, wait: 13, miss: 0, state: 'En cours' },
  { l: '13:15', total: 24, served: 0, wait: 24, miss: 0, state: 'À venir' },
];
const NAMES = ['Aya Konan', 'Ibrahim Traoré', 'Marie-Laure Yao', 'Koffi N’Guessan', 'Fatou Bamba', 'Junior Kouassi', 'Awa Diabaté', 'Serge Aka'];
const ALLERGIES = ['Arachide', '—', '—', 'Lait', '—', '—', '—', 'Poisson'];
const STATUS_COLOR = { Servi: 'text-ok', Attendu: 'text-marine', 'Non récupéré': 'text-danger' };

// Lignes fictives générées comme dans la maquette.
function rowsFor(sel) {
  return NAMES.map((n, k) => {
    let s;
    if (sel < 2) s = k === 3 ? 'Non récupéré' : 'Servi';
    else if (sel === 2) s = k < 5 ? 'Servi' : 'Attendu';
    else s = 'Attendu';
    return { n, id: `VTL-2024-${100 + k * 7 + sel * 3}`, code: `VTL-${String(4800 + k * 13 + sel * 101).slice(0, 4)}`, al: ALLERGIES[k], s };
  });
}

// Maquette : admin-03-commandes
export default function OrdersPage() {
  const [sel, setSel] = useState(2);
  const cur = SLOTS[sel];

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Mardi 24 · Attiéké poisson braisé</span><h1 className="h1">Commandes du jour</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <label htmlFor="q" className="absolute left-[-9999px]">Rechercher</label>
          <input id="q" placeholder="Rechercher un élève ou un code" className="h-[52px] w-[300px] max-w-full border border-line rounded-[14px] px-[18px] text-[16px] bg-white" />
          <button type="button" className="btn p"><Icon name="printer" />Imprimer</button>
        </div>
      </div>

      <div role="tablist" aria-label="Créneaux" className="flex bg-track rounded-[14px] p-1 mt-9 max-w-[720px]">
        {SLOTS.map((s, i) => (
          <button
            key={s.l}
            type="button"
            role="tab"
            aria-selected={i === sel}
            onClick={() => setSel(i)}
            className={`flex-1 h-[58px] rounded-[11px] cursor-pointer flex flex-col items-center justify-center gap-0.5 text-ink ${i === sel ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'bg-transparent'}`}
          >
            <span className="num text-[17px] font-extrabold">{s.l}</span>
            <span className="text-[13px] font-semibold text-muted">{s.state}</span>
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-3.5 mt-9 flex-wrap">
        <span className="num text-[72px] leading-[76px] font-black tracking-[-2.5px]">{cur.total}</span>
        <span className="num text-[22px] font-bold text-muted">réservations · {cur.l}</span>
      </div>
      <div className="stats mt-[18px]">
        <div className="stat"><b className="num">{cur.served}</b><span>servis</span></div>
        <div className="stat"><b className="num">{cur.wait}</b><span>attendus</span></div>
        <div className="stat"><b className="num">{cur.miss}</b><span>non récupérés</span></div>
      </div>

      <div className="list mt-9 overflow-x-auto">
        <div className="li text-[13px] font-bold text-muted uppercase tracking-[0.4px] min-w-[720px] box-content">
          <span className="flex-[2]">Élève</span><span className="flex-[1.2]">N° étudiant</span><span className="flex-1">Code</span><span className="flex-1">Allergies</span><span className="w-[130px] text-right">Statut</span>
        </div>
        {rowsFor(sel).map((r) => (
          <div key={r.n} className="li min-w-[720px] box-content">
            <b className="flex-[2] font-bold">{r.n}</b>
            <span className="num flex-[1.2] text-muted">{r.id}</span>
            <span className="num flex-1 font-mono text-marine font-bold">{r.code}</span>
            <span className="flex-1 text-muted">{r.al}</span>
            <span className={`w-[130px] text-right text-[15px] font-bold ${STATUS_COLOR[r.s]}`}>{r.s}</span>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[13px] text-muted">8 premières lignes · noms fictifs.</p>
    </>
  );
}
