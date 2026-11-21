import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackLink from '../../components/common/BackLink';
import RadioDot from '../../components/common/RadioDot';
import { useActionLoader } from '../../components/common/Loader';

const SLOTS = [
  { id: 'a', label: '11:45 – 12:15', used: 68, cap: 70 },
  { id: 'b', label: '12:15 – 12:45', used: 70, cap: 70 },
  { id: 'c', label: '12:45 – 13:15', used: 52, cap: 70 },
  { id: 'd', label: '13:15 – 13:45', used: 24, cap: 50 },
];

// Maquette : eleve-05-creneau
export default function SlotPage() {
  const [sel, setSel] = useState('c');
  const cur = SLOTS.find((s) => s.id === sel);
  const navigate = useNavigate();
  const { busy, run, overlay } = useActionLoader('Paiement en cours…');

  return (
    <div className="flex flex-1 flex-col">
      <BackLink to="/student" />
      <div className="px-5 pt-2">
        <h1 className="text-[34px] leading-[40px] font-black tracking-[-1px]">Choisir un créneau</h1>
        <p className="mt-2 text-[16px] text-muted">Attiéké poisson braisé · mardi 24</p>
      </div>

      <div role="radiogroup" aria-label="Créneaux" className="mt-[22px]">
        {SLOTS.map((s) => {
          const full = s.used >= s.cap;
          const on = s.id === sel && !full;
          const left = s.cap - s.used;
          return (
            <button
              key={s.id}
              type="button"
              className={`slot ${full ? 'opacity-50 cursor-not-allowed' : on ? 'bg-tint' : ''}`}
              role="radio"
              aria-checked={on}
              disabled={full}
              onClick={() => setSel(s.id)}
            >
              <RadioDot on={on} filled />
              <span className="num flex-1 text-[18px] font-bold">{s.label}</span>
              <span className={`num text-[15px] font-semibold ${!full && left <= 5 ? 'text-danger' : 'text-muted'}`}>{full ? 'Complet' : `${left} places`}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-5 pb-[34px]">
        <div className="sum"><span className="text-muted">Solde actuel</span><span className="num font-semibold">4 500 F</span></div>
        <div className="sum"><span className="text-muted">Repas</span><span className="num font-semibold">−1 500 F</span></div>
        <div className="sum border-t border-line mt-1.5 pt-3.5"><b>Solde après</b><b className="num">3 000 F</b></div>
        <button type="button" className="primary mt-5 num" disabled={busy} onClick={() => run(() => navigate('/student/ticket'))}>Payer 1 500 F · {cur.label.split(' – ')[0]}</button>
        <p className="mt-3.5 text-center text-[13px] text-muted">Annulation remboursée jusqu'à 10 h 30.</p>
      </div>
      {overlay}
    </div>
  );
}
