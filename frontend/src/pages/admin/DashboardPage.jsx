import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { RollText } from '../../components/common/kbr';

const SLOTS = [['11:45', 68, 70], ['12:15', 70, 70], ['12:45', 52, 70], ['13:15', 24, 50]];
const DAYS = [
  ['Lun 23', 'Riz sauce graine', 198, false],
  ['Mar 24', 'Attiéké poisson braisé', 214, true],
  ['Mer 25', 'Alloco poulet braisé', 131, false],
  ['Jeu 26', 'Foutou sauce arachide', 87, false],
  ['Ven 27', 'Kédjénou de poulet', 64, false],
];

// Maquette : admin-01-dashboard
export default function DashboardPage() {
  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Mardi 24 novembre · 13:00</span><h1 className="h1">Tableau de bord</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <Link className="btn s" to="/admin/menus">Menus</Link>
          <Link className="btn p" to="/admin/scan"><Icon name="qr" />Ouvrir le scan</Link>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-1.5">
        <span className="text-[17px] font-semibold text-muted">Réservations aujourd’hui · Attiéké poisson braisé</span>
        <div className="flex items-baseline gap-3.5 flex-wrap">
          <RollText className="num text-[104px] leading-[108px] font-black tracking-[-4px]" text="214" />
          <span className="num text-[28px] font-extrabold text-muted tracking-[-0.5px]">sur 260 portions</span>
        </div>
        <div className="h-2 rounded-[4px] bg-track max-w-[640px] mt-2.5 overflow-hidden"><div className="grow w-[82%] h-full bg-marine rounded-[4px]" /></div>
        <span className="text-[15px] text-muted mt-1.5">82 % de la capacité · 46 portions encore libres</span>
      </div>

      <div className="mt-10">
        <div className="stats">
          <div className="stat"><b className="num text-ok">168</b><span>servis</span></div>
          <div className="stat"><b className="num text-marine">37</b><span>à servir</span></div>
          <div className="stat"><b className="num text-danger">9</b><span>non récupérés</span></div>
          <div className="stat"><b className="num text-ink">321 000 F</b><span>encaissés</span></div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-10 mt-2">
        <div>
          <div className="sec"><h2 className="h2">Créneaux</h2><Link to="/admin/commandes" className="text-[15px] font-bold no-underline">Voir les commandes</Link></div>
          <div className="list">
            {SLOTS.map(([l, u, c]) => (
              <div key={l} className="li">
                <b className="num w-16 font-extrabold">{l}</b>
                <span className="flex-1 h-2 rounded-[4px] bg-track overflow-hidden block">
                  <span className="grow block h-full rounded-[4px]" style={{ width: `${Math.round((u / c) * 100)}%`, background: u >= c ? '#072A5D' : '#67B2E8' }} />
                </span>
                <span className="num w-[150px] text-right text-[15px] font-semibold text-muted">{u} / {c}{u >= c ? ' · complet' : ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="sec"><h2 className="h2">Cette semaine</h2><span className="text-[15px] text-muted">réservations / 260</span></div>
          <div className="list">
            {DAYS.map(([l, dish, v, today]) => (
              <div key={l} className="li">
                <span className={`w-16 text-[14px] ${today ? 'font-extrabold text-marine' : 'font-bold text-muted'}`}>{l}</span>
                <span className="flex-1 min-w-0 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{dish}</span>
                <b className="num w-14 text-right font-extrabold">{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec"><h2 className="h2">À traiter</h2><span className="text-[15px] text-muted">2 signalements</span></div>
      <div className="list">
        <Link className="li" to="/admin/menus">
          <span className="tag bg-danger-bg text-danger">Allergène</span>
          <div className="t"><b>Foutou sauce arachide · jeudi 26</b><small>Un élève signale du céleri non indiqué sur la fiche.</small></div>
          <Icon name="chevronRight" className="text-muted" />
        </Link>
        <Link className="li" to="/admin/menus">
          <span className="tag bg-tint-yellow text-ink">Fiche incomplète</span>
          <div className="t"><b>Kédjénou de poulet · vendredi 27</b><small>Allergènes non vérifiés : les élèves voient « informations non vérifiées ».</small></div>
          <Icon name="chevronRight" className="text-muted" />
        </Link>
      </div>
      <p className="mt-5 text-[13px] text-muted">Données fictives de maquette.</p>
    </>
  );
}
