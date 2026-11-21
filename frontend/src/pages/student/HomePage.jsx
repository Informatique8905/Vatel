import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import { RollText } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import {
  getWallet, getMenuItems, getTransactions, todayKey, fmtDateTime, TX_LABEL,
} from '../../services/cantine';
import { formatF } from '../../utils/format';

// Accueil élève : solde réel, offre du jour, dernières opérations du ledger.
export default function HomePage() {
  const [masked, setMasked] = useState(false);
  const today = todayKey();
  const { data: wallet } = useData(() => getWallet().then((d) => d.wallet), []);
  const { data: items } = useData(() => getMenuItems(`?date=${today}`).then((d) => d.items), [today]);
  const { data: tx } = useData(() => getTransactions('?pageSize=3').then((d) => d.transactions), []);

  const item = items?.[0];
  const balance = wallet?.balance;

  return (
    <div>
      <div className="px-5 pt-[52px] flex justify-between items-center">
        <AvatarLink to="/student/profil" label="Profil" />
      </div>

      <div className="px-5 pt-[18px] flex flex-col items-center gap-1.5">
        <button
          type="button"
          className="ico text-[17px] font-semibold text-muted flex items-center gap-2 px-2 py-1"
          aria-label={masked ? 'Afficher le solde' : 'Masquer le solde'}
          aria-pressed={masked}
          onClick={() => setMasked(!masked)}
        >
          Solde <Icon name={masked ? 'eyeOff' : 'eye'} size={20} />
        </button>
        <RollText
          className="num text-[52px] leading-[60px] font-black tracking-[-1.5px] text-ink"
          text={masked ? '• • • • •' : balance == null ? '…' : formatF(balance)}
        />
      </div>

      <div className="px-5 pt-[18px]"><Link className="primary" to="/student/creneau"><Icon name="plus" />Réserver mon repas</Link></div>

      <div className="flex justify-between px-3 pt-[30px]">
        <Link className="act" to="/student/ticket"><span className="c"><Icon name="qr" size={28} /></span>Mon<br />ticket</Link>
        <Link className="act" to="/student/menu"><span className="c"><Icon name="calendar" size={28} /></span>Menu de<br />la semaine</Link>
        <Link className="act" to="/student/profil"><span className="c"><Icon name="shield" size={28} /></span>Mes<br />allergies</Link>
      </div>

      <div className="px-5 pt-[34px] pb-3 flex justify-between items-baseline">
        <h2 className="h2">Aujourd'hui</h2>
      </div>
      <div className="list">
        {item ? (
          <Link className="li" to={`/student/creneau?item=${item.id}`}>
            <span className="w-[52px] h-[52px] rounded-[26px] bg-tint flex items-center justify-center flex-none overflow-hidden">
              {item.dish.photoUrl
                ? <img src={item.dish.photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="w-[30px] h-[30px] rounded-[15px] border-2 border-vatel bg-white box-content" />}
            </span>
            <div className="t"><b>{item.dish.name}</b><small>{item.allergenAlert ? `⚠ ${item.matchedAllergens.map((a) => a.name).join(', ')}` : `${item.remaining} places restantes`}</small></div>
            <span className="num text-[16px] font-extrabold text-marine">{formatF(item.price)}</span>
          </Link>
        ) : items ? (
          <div className="li"><div className="t"><b>Aucun plat publié</b><small>Revenez plus tard</small></div></div>
        ) : null}
      </div>

      <div className="px-5 pt-7 pb-3 flex justify-between items-baseline">
        <h2 className="h2">Historique</h2>
        <Link to="/student/solde" className="text-[14px] font-bold no-underline text-marine">Tout afficher</Link>
      </div>
      <div className="list">
        {(tx ?? []).map((t) => (
          <div key={t.id} className="li">
            <div className="t"><b>{TX_LABEL[t.type] ?? t.type}</b><small>{fmtDateTime(t.createdAt)} · {t.reference}</small></div>
            <span className={`num text-[16px] font-bold ${t.amount >= 0 ? 'text-ok' : 'text-danger'}`}>{formatF(t.amount)}</span>
          </div>
        ))}
        {tx && tx.length === 0 && (
          <div className="li"><div className="t"><b>Aucune opération</b><small>Vos mouvements apparaîtront ici</small></div></div>
        )}
      </div>
    </div>
  );
}
