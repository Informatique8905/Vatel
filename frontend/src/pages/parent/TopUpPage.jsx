import { useState } from 'react';
import AvatarLink from '../../components/common/AvatarLink';
import { VatelSegmented, AppButton, RollText, toastBus } from '../../components/common/kbr';
import RadioDot from '../../components/common/RadioDot';
import { PageLoader, LoadingOverlay } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getChildren, createTopup, apiMessage } from '../../services/cantine';
import { formatF } from '../../utils/format';

const AMOUNTS = [2000, 5000, 10000, 20000];
const OPERATORS = [
  { id: 'WAVE', name: 'Wave', ini: 'W' },
  { id: 'ORANGE_MONEY', name: 'Orange Money', ini: 'OM' },
  { id: 'MTN_MOMO', name: 'MTN MoMo', ini: 'MTN' },
  { id: 'MOOV_MONEY', name: 'Moov Money', ini: 'MV' },
  { id: 'DJAMO', name: 'Djamo', ini: 'DJ' },
];

// Parent-02 : recharge réelle. POST /payments/topups crée l'intention Jeko
// (montant interne en XOF entier) puis redirige vers le checkout hébergé.
// Seul le webhook vérifié créditera le wallet — jamais la redirection.
export default function TopUpPage() {
  const { data, loading } = useData(() => getChildren(), []);
  const children = data?.children ?? [];

  const [kid, setKid] = useState(null);
  const [amt, setAmt] = useState(5000);
  const [op, setOp] = useState('WAVE');
  const [paying, setPaying] = useState(false);

  const child = children.find((c) => c.studentId === kid) ?? children[0];
  const options = children.map((c) => ({
    id: c.studentId,
    label: `${c.name.split(' ')[0]} · ${formatF(c.balance)}`,
  }));

  const pay = async () => {
    if (!child || paying) return;
    setPaying(true);
    try {
      const { payment } = await createTopup({
        studentId: child.studentId,
        amount: amt,
        operator: op,
        idempotencyKey: crypto.randomUUID(),
      });
      if (payment.redirectUrl) {
        window.location.assign(payment.redirectUrl); // checkout hébergé Jeko
      } else {
        toastBus.show(`Demande de recharge créée — statut ${payment.status}`);
        setPaying(false);
      }
    } catch (err) {
      toastBus.show(apiMessage(err));
      setPaying(false);
      throw err; // l'AppButton repasse en erreur
    }
  };

  if (loading) return <PageLoader fill="100dvh" />;

  if (children.length === 0) {
    return (
      <div>
        <div className="px-5 pt-[52px]"><AvatarLink to="/parent/compte" label="Compte" /><h1 className="h1 mt-[22px]">Recharger</h1></div>
        <p className="px-8 pt-16 text-center text-[16px] font-semibold text-muted">Liez d’abord un enfant à votre compte pour recharger son portefeuille.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink to="/parent/compte" label="Compte" />
        <h1 className="h1 mt-[22px]">Recharger</h1>
        <div className="mt-4"><VatelSegmented options={options} value={child?.studentId} onChange={setKid} label="Enfant" /></div>
      </div>

      <div className="flex flex-col items-center px-5 pt-5">
        <RollText className="num text-[56px] leading-[64px] font-black tracking-[-1.5px]" text={formatF(amt)} />
        <span className="num text-[15px] text-muted">Nouveau solde : <RollText text={formatF((child?.balance ?? 0) + amt)} /></span>
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
          label={`Payer ${formatF(amt)}`}
          busyLabel="Création du paiement…"
          doneLabel="Redirection…"
          onDone={pay}
        />
        <p className="mt-3 text-center text-[13px] text-muted">Le solde est crédité après confirmation du paiement par l’opérateur.</p>
      </div>
      {paying && <LoadingOverlay label="Redirection vers le paiement…" />}
    </div>
  );
}
