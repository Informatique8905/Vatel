import Icon from '../../components/common/Icon';
import { CodeInput, AppButton, Field, toastBus } from '../../components/common/kbr';

const PASSAGES = [
  { title: 'Aya Konan · VTL-4821', sub: 'QR code', status: 'Validé', cls: 'text-ok', time: '13:01' },
  { title: 'VTL-4790', sub: 'Déjà utilisé à 12:48', status: 'Refusé', cls: 'text-danger', time: '13:00' },
  { title: 'Ibrahim Traoré', sub: 'Manuel · téléphone déchargé', status: 'Manuel', cls: 'text-marine', time: '12:58' },
  { title: 'VTL-4655', sub: 'Créneau 13:15, trop tôt', status: 'Refusé', cls: 'text-danger', time: '12:57' },
];

// Maquette : admin-05-scan
export default function ScanPage() {
  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Comptoir 1 · créneau 12:45 – 13:15</span><h1 className="h1">Scan des tickets</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex items-baseline gap-2">
            <b className="num text-[40px] font-black text-ok tracking-[-1px]">39</b>
            <span className="num text-[17px] font-bold text-muted">/ 52 servis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-10 mt-9 items-start">
        <div className="flex flex-col gap-5">
          <div className="bg-ink rounded-[20px] h-[360px] relative flex items-center justify-center overflow-hidden">
            <div className="w-[220px] h-[220px] border-[3px] border-white rounded-[20px] relative box-content">
              <span className="scanline absolute left-4 right-4 top-1/2 h-0.5 bg-vatel" />
            </div>
            <span className="absolute bottom-5 left-0 right-0 text-center text-white text-[15px] font-semibold">Placez le QR code dans le cadre</span>
          </div>
          <div role="status" className="flex gap-4 items-center py-1">
            <span className="w-14 h-14 rounded-[28px] bg-ok text-white flex items-center justify-center flex-none"><Icon name="check" size={28} sw={2.6} /></span>
            <div className="flex-1">
              <b className="text-[26px] leading-[32px] font-black tracking-[-0.6px] text-ok">Ticket validé</b>
              <div className="text-[16px] text-muted mt-0.5">Aya Konan · VTL-4821 · Attiéké poisson</div>
            </div>
            <span className="num text-[15px] font-bold text-muted">13:01:12</span>
          </div>
          <div className="sec mt-3"><h2 className="h2">Derniers passages</h2></div>
          <div className="list">
            {PASSAGES.map((p) => (
              <div key={p.title + p.time} className="li">
                <div className="t"><b>{p.title}</b><small>{p.sub}</small></div>
                <span className={`font-bold ${p.cls}`}>{p.status}</span>
                <span className="num w-[52px] text-right text-muted">{p.time}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
          <div>
            <h2 className="h2 text-[26px]">Validation manuelle</h2>
            <p className="mt-2 text-[15px] leading-[22px] text-muted">Si le QR ne passe pas : code de secours ou recherche par nom.</p>
          </div>
          <div className="fld">
            <label>Code de secours (4 chiffres)</label>
            <CodeInput
              length="4"
              label="Entrez les 4 chiffres après VTL-"
              test-code="4821"
              onVerified={() => toastBus.show('Ticket VTL-4821 validé · repas remis')}
            />
          </div>
          <div className="flex items-center gap-3 text-muted text-[14px] font-semibold"><span className="flex-1 h-px bg-line" />ou<span className="flex-1 h-px bg-line" /></div>
          <div className="fld"><label htmlFor="nom">Nom ou n° étudiant</label><Field id="nom" defaultValue="Traoré" /></div>
          <div className="list">
            <div className="li bg-tint">
              <span className="w-11 h-11 rounded-[22px] bg-marine text-white flex items-center justify-center font-extrabold text-[15px] flex-none">IT</span>
              <div className="t"><b>Ibrahim Traoré</b><small className="text-marine">Réservé 12:45 · payé · non servi</small></div>
            </div>
          </div>
          <div className="fld">
            <label htmlFor="motif">Motif (obligatoire)</label>
            <select id="motif"><option>Téléphone déchargé</option><option>QR illisible</option><option>Pas de réseau</option><option>Autre</option></select>
          </div>
          <AppButton label="Valider le repas" busyLabel="Validation…" doneLabel="Repas servi" className="btn p h-[60px] justify-center text-[17px]" onDone={() => toastBus.show('Validation manuelle tracée · ticket inutilisable')} />
          <p className="text-[13px] leading-[19px] text-muted">Chaque validation manuelle est tracée (agent, heure, motif) et rend le ticket inutilisable.</p>
        </form>
      </div>
    </>
  );
}
