import { Link } from 'react-router-dom';
import AvatarLink from '../../components/common/AvatarLink';
import { RollText, TxRow } from '../../components/common/kbr';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getWallet, getTransactions, fmtDateTime, TX_LABEL } from '../../services/cantine';
import { formatF } from '../../utils/format';

// Portefeuille élève : solde du ledger + journal des opérations (§8).
export default function WalletPage() {
  const { data: wallet, loading } = useData(() => getWallet().then((d) => d.wallet), []);
  const { data: tx } = useData(() => getTransactions('?pageSize=20').then((d) => d.transactions), []);

  if (loading) return <PageLoader fill="100dvh" />;
  const meals = wallet ? Math.floor(wallet.balance / 1500) : 0;
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  return (
    <div>
      <div className="px-5 pt-[52px]"><AvatarLink to="/student/profil" label="Profil" /></div>
      <div className="flex flex-col items-center gap-1.5 px-5 pt-[18px]">
        <span className="text-[17px] font-semibold text-muted">Solde disponible</span>
        <RollText className="num text-[52px] leading-[60px] font-black tracking-[-1.5px]" text={formatF(wallet?.balance ?? 0)} />
        <span className="text-[15px] text-muted">{meals} repas à 1 500 F</span>
        {wallet?.lowBalance && <span className="tag bg-tint-yellow text-ink mt-1">Solde faible — demandez une recharge</span>}
      </div>
      <div className="px-5 pt-[22px]">
        <Link className="primary flex" to="/student/menu">Réserver un repas</Link>
      </div>
      <p className="mx-8 mt-3.5 text-center text-[14px] leading-[21px] text-muted">Votre parent recharge votre portefeuille depuis son espace.</p>

      <div className="px-5 pt-[30px] pb-3 flex justify-between items-baseline">
        <h2 className="h2">Historique</h2>
        <span className="text-[14px] font-semibold text-muted">{month}</span>
      </div>
      <div className="list mx-5 mb-6 rounded-[20px] border border-line bg-white overflow-hidden shadow-[0_1px_3px_rgba(7,42,93,.06)]">
        {(tx ?? []).map((t) => (
          <TxRow
            key={t.id}
            title={TX_LABEL[t.type] ?? t.type}
            sub={`${fmtDateTime(t.createdAt)} · ${t.reference}`}
            amount={formatF(t.amount)}
            credit={t.amount >= 0}
          />
        ))}
        {tx && tx.length === 0 && (
          <div className="li"><div className="t"><b>Aucune opération</b><small>Le journal est vide pour l’instant</small></div></div>
        )}
      </div>
    </div>
  );
}
