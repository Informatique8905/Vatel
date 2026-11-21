import { useState } from 'react';
import { VatelSegmented, AppButton, RollText, toastBus } from '../../components/common/kbr';
import RadioDot from '../../components/common/RadioDot';
import { formatF } from '../../utils/format';

const BALANCES = { aya: 3000, yao: 1000 };
const KIDS = [
  { id: 'aya', label: 'Aya · 3 000 F' },
  { id: 'yao', label: 'Yao · 1 000 F' },
];
const AMOUNTS = [2000, 5000, 10000, 20000];
const OPERATORS = [
  { id: 'wave', name: 'Wave', ini: 'W' },
  { id: 'om', name: 'Orange Money', ini: 'OM' },
  { id: 'mtn', name: 'MTN MoMo', ini: 'MTN' },
  { id: 'moov', name: 'Moov Money', ini: 'MV' },
];

// Maquette : parent-02-recharge (mode démo : aucun paiement réel)
export default function TopUpPage() {
  const [kid, setKid] = useState('yao');
  const [amt, setAmt] = useState(5000);
  const [op, setOp] = useState('wave');

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <span className="inline-block px-2.5 py-1.5 rounded-[8px] bg-tint-yellow text-[12px] font-extrabold tracking-[0.6px]">MODE DÉMO</span>
        <h1 className="h1 mt-2.5">Recharger</h1>
        <div className="mt-4"><VatelSegmented options={KIDS} value={kid} onChange={setKid} label="Enfant" /></div>
      </div>

      <div className="flex flex-col items-center px-5 pt-5">
        <RollText className="num text-[56px] leading-[64px] font-black tracking-[-1.5px]" text={formatF(amt)} />
        <span className="num text-[15px] text-muted">Nouveau solde : <RollText text={formatF(BALANCES[kid] + amt)} /></span>
      </div>

      <div className="flex gap-2 px-5 pt-4">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmt(a)}
            className={`num flex-1 h-11 rounded-[22px] text-[15px] font-bold cursor-pointer ${a === amt ? 'bg-marine text-white' : 'bg-white text-ink border border-line'}`}
          >
            {a / 1000} 000
          </button>
        ))}
      </div>

      <div className="list mt-[18px]" role="radiogroup" aria-label="Moyen de paiement">
        {OPERATORS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === op}
            onClick={() => setOp(o.id)}
            className="w-full flex items-center gap-3.5 px-5 py-[13px] border-b border-soft bg-white text-left cursor-pointer text-ink"
          >
            <span className="w-10 h-10 rounded-[12px] bg-soft text-muted flex items-center justify-center text-[12px] font-extrabold flex-none">{o.ini}</span>
            <span className="flex-1 text-[16px] font-bold">{o.name}</span>
            <RadioDot on={o.id === op} />
          </button>
        ))}
      </div>

      <div className="px-5 pt-4">
        <AppButton
          label={`Simuler le paiement · ${formatF(amt)}`}
          busyLabel="Paiement en cours…"
          doneLabel="Rechargé !"
          onDone={() => toastBus.show(`Recharge de ${formatF(amt)} confirmée pour ${KIDS.find((k) => k.id === kid)?.label.split(' · ')[0]}`)}
        />
      </div>
    </div>
  );
}
