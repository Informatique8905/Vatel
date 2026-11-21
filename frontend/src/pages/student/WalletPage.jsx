import Icon from '../../components/common/Icon';
import AvatarLink from '../../components/common/AvatarLink';
import { AppButton, RollText, toastBus } from '../../components/common/kbr';

const HISTORY = [
  { title: 'Attiéké poisson braisé', sub: "Réservé · aujourd'hui", amount: '−1 500 F', credit: false },
  { title: 'Riz sauce graine', sub: 'Servi · lun. 23 nov.', amount: '−1 500 F', credit: false },
  { title: 'Recharge parent', sub: 'Wave (démo) · ven. 20 nov.', amount: '+10 000 F', credit: true },
  { title: 'Remboursement', sub: 'Annulé avant 10 h 30 · jeu. 19', amount: '+1 500 F', credit: true },
  { title: 'Alloco · non récupéré', sub: 'Repas débité · mer. 18', amount: '−1 750 F', credit: false },
];

// Maquette : eleve-07-portefeuille
export default function WalletPage() {
  return (
    <div>
      <div className="px-5 pt-[52px]"><AvatarLink to="/student/profil" label="Profil" /></div>
      <div className="flex flex-col items-center gap-1.5 px-5 pt-[18px]">
        <span className="text-[17px] font-semibold text-muted">Solde disponible</span>
        <RollText className="num text-[52px] leading-[60px] font-black tracking-[-1.5px]" text="3 000 F" />
        <span className="text-[15px] text-muted">2 repas à 1 500 F</span>
      </div>
      <div className="px-5 pt-[22px]"><AppButton label="Demander une recharge" busyLabel="Envoi…" doneLabel="Demande envoyée" onDone={() => toastBus.show('Votre parent a reçu la demande de recharge')} /></div>
      <p className="mx-8 mt-3.5 text-center text-[14px] leading-[21px] text-muted">Votre parent reçoit la demande et recharge depuis son espace.</p>

      <div className="px-5 pt-[30px] pb-3"><h2 className="h2">Historique</h2></div>
      <div className="bg-white">
        {HISTORY.map((h) => (
          <div key={h.title + h.sub} className="li">
            <div className="t"><b>{h.title}</b><small>{h.sub}</small></div>
            <span className={`amt num ${h.credit ? 'text-ok' : 'text-danger'}`}>{h.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
