import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackLink from '../../components/common/BackLink';
import RadioDot from '../../components/common/RadioDot';
import { HoldButton, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { MENU_EXTRAS } from '../../data/weekMenu';
import { formatF } from '../../utils/format';

const SLOTS = [
  { id: 'a', label: '11:45 – 12:15', used: 68, cap: 70 },
  { id: 'b', label: '12:15 – 12:45', used: 70, cap: 70 },
  { id: 'c', label: '12:45 – 13:15', used: 52, cap: 70 },
  { id: 'd', label: '13:15 – 13:45', used: 24, cap: 50 },
];

const MEAL_PRICE = 1500;
const BALANCE = 4500;

// Maquette : eleve-05-creneau — les suppléments (jus, fruits, desserts)
// se composent ici, au moment de la réservation, et suivent le total.
export default function SlotPage() {
  const [sel, setSel] = useState('c');
  const [extras, setExtras] = useState([]);
  const cur = SLOTS.find((s) => s.id === sel);
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Paiement en cours…');

  const toggleExtra = (key) =>
    setExtras((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  const extrasTotal = MENU_EXTRAS
    .flatMap((g) => g.items)
    .filter((it) => extras.includes(it.key))
    .reduce((t, it) => t + it.price, 0);
  const total = MEAL_PRICE + extrasTotal;

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

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-6 pb-3">
        <h2 className="h2">Compléter le plateau</h2>
        <p className="mt-1 text-[14px] text-muted">Jus, fruits et desserts en supplément.</p>
        {MENU_EXTRAS.map((g) => (
          <div key={g.group} className="mt-4">
            <p className="xname">{g.group}</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((it) => {
                const on = extras.includes(it.key);
                return (
                  <button
                    key={it.key}
                    type="button"
                    className={`xopt${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleExtra(it.key)}
                  >
                    {it.name}<span className="num">+{formatF(it.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-[34px]">
        <div className="sum"><span className="text-muted">Solde actuel</span><span className="num font-semibold">{formatF(BALANCE)}</span></div>
        <div className="sum"><span className="text-muted">Repas</span><span className="num font-semibold">−{formatF(MEAL_PRICE)}</span></div>
        {extrasTotal > 0 && (
          <div className="sum"><span className="text-muted">Suppléments ({extras.length})</span><span className="num font-semibold">−{formatF(extrasTotal)}</span></div>
        )}
        <div className="sum border-t border-line mt-1.5 pt-3.5"><b>Solde après</b><b className="num">{formatF(BALANCE - total)}</b></div>
        <div className="mt-5">
          <HoldButton
            label={`Maintenir pour payer ${formatF(total)} · ${cur.label.split(' – ')[0]}`}
            doneLabel="Réservé !"
            holdMs={900}
            onConfirm={() => run(() => {
              toastBus.show(`Réservation confirmée · −${formatF(total)} · ${cur.label}`);
              navigate('/student/ticket');
            })}
          />
        </div>
        <p className="mt-3.5 text-center text-[13px] text-muted">Annulation remboursée jusqu'à 10 h 30.</p>
      </div>
      {overlay}
    </div>
  );
}
