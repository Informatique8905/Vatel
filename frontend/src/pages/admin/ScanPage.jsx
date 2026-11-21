import { useRef, useState } from 'react';
import Icon from '../../components/common/Icon';
import { AppButton, toastBus } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import { scanTicket, manualCollect, getDistributions, todayKey, fmtDay, slotText, apiMessage } from '../../services/cantine';

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Admin-05 : remise des repas. Saisie du jeton QR (douchette ou collage)
// -> POST /distributions/scan ; plan B : validation manuelle depuis la
// liste CONFIRMED du jour -> POST /distributions/manual (§6 DÉCIDÉ).
export default function ScanPage() {
  const today = todayKey();
  const { data: rows, reload } = useData(
    () => getDistributions(`?date=${today}`).then((d) => d.reservations).catch(() => []),
    [today],
  );

  const [token, setToken] = useState('');
  const [log, setLog] = useState([]);
  const [last, setLast] = useState(null);
  const [sel, setSel] = useState(null);
  const inputRef = useRef(null);

  const push = (entry) => setLog((l) => [{ ...entry, time: now() }, ...l].slice(0, 12));

  const scan = async (value) => {
    const t = (value ?? token).trim();
    if (!t) return;
    try {
      const { reservation } = await scanTicket(t);
      const label = `${reservation?.student?.name ?? 'Ticket'} · ${reservation?.menuItem?.dish ?? ''}`;
      setLast({ ok: true, text: `${label} validé` });
      push({ title: label, sub: 'QR code', status: 'Validé', cls: 'text-ok' });
      setToken('');
      reload();
    } catch (err) {
      const msg = apiMessage(err);
      setLast({ ok: false, text: msg });
      push({ title: `Jeton ${t.slice(-6).toUpperCase()}`, sub: msg, status: 'Refusé', cls: 'text-danger' });
    } finally {
      inputRef.current?.focus();
    }
  };

  const collect = async () => {
    if (!sel) return;
    try {
      await manualCollect(sel.reservationId);
      const label = `${sel.student.name} · ${sel.menuItem.dish}`;
      setLast({ ok: true, text: `${label} · validation manuelle` });
      push({ title: sel.student.name, sub: 'Manuel', status: 'Manuel', cls: 'text-marine' });
      setSel(null);
      reload();
    } catch (err) { toastBus.show(apiMessage(err)); return false; }
  };

  const served = (rows ?? []).filter((r) => r.status === 'COLLECTED').length;
  const pending = (rows ?? []).filter((r) => r.status === 'CONFIRMED');

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{fmtDay(today)} · comptoir</span><h1 className="h1">Scan des tickets</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex items-baseline gap-2">
            <b className="num text-[40px] font-black text-ok tracking-[-1px]">{served}</b>
            <span className="num text-[17px] font-bold text-muted">/ {(rows ?? []).length} servis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-10 mt-9 items-start">
        <div className="flex flex-col gap-5">
          <div className="bg-ink rounded-[20px] relative flex flex-col items-center justify-center overflow-hidden p-6 gap-4">
            <div className="w-[200px] h-[200px] border-[3px] border-white rounded-[20px] relative box-content flex-none">
              <span className="scanline absolute left-4 right-4 top-1/2 h-0.5 bg-vatel" />
            </div>
            <input
              ref={inputRef}
              className="w-full max-w-[420px] h-14 px-4 rounded-[12px] bg-white/10 border border-white/25 text-white text-[15px] font-mono outline-none focus:border-vatel placeholder:text-white/50"
              placeholder="Collez ou scannez le jeton QR…"
              value={token}
              autoFocus
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && scan()}
            />
            <span className="text-white/70 text-[13px] font-semibold">Douchette USB : le jeton est validé à la touche Entrée</span>
          </div>

          {last && (
            <div role="status" className="flex gap-4 items-center py-1">
              <span className={`w-14 h-14 rounded-[28px] text-white flex items-center justify-center flex-none ${last.ok ? 'bg-ok' : 'bg-danger'}`}>
                <Icon name={last.ok ? 'check' : 'x'} size={28} sw={2.6} />
              </span>
              <div className="flex-1">
                <b className={`text-[24px] leading-[30px] font-black tracking-[-0.6px] ${last.ok ? 'text-ok' : 'text-danger'}`}>{last.ok ? 'Ticket validé' : 'Refusé'}</b>
                <div className="text-[16px] text-muted mt-0.5">{last.text}</div>
              </div>
            </div>
          )}

          <div className="sec mt-3"><h2 className="h2">Derniers passages</h2></div>
          <div className="list">
            {log.map((p, i) => (
              <div key={`${p.title}-${i}`} className="li">
                <div className="t"><b>{p.title}</b><small>{p.sub}</small></div>
                <span className={`font-bold ${p.cls}`}>{p.status}</span>
                <span className="num w-[52px] text-right text-muted">{p.time}</span>
              </div>
            ))}
            {log.length === 0 && <div className="li"><div className="t"><b>Aucun passage</b><small>Les validations apparaîtront ici</small></div></div>}
          </div>
        </div>

        <form className="flex flex-col gap-[22px]" onSubmit={(e) => { e.preventDefault(); scan(); }}>
          <div>
            <h2 className="h2 text-[26px]">Validation manuelle</h2>
            <p className="mt-2 text-[15px] leading-[22px] text-muted">Téléphone déchargé ou QR illisible : sélectionnez l’élève dans la liste des réservations confirmées du jour.</p>
          </div>
          <div className="list max-h-[420px] overflow-y-auto">
            {pending.map((r) => (
              <button
                key={r.reservationId}
                type="button"
                onClick={() => setSel(r)}
                className={`li w-full text-left cursor-pointer ${sel?.reservationId === r.reservationId ? 'bg-tint' : ''}`}
              >
                <span className="w-11 h-11 rounded-[22px] bg-marine text-white flex items-center justify-center font-extrabold text-[15px] flex-none">
                    {r.student.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                <div className="t"><b>{r.student.name}</b><small className="text-marine">{r.menuItem.dish} · {slotText(r.timeSlot)}</small></div>
              </button>
            ))}
            {pending.length === 0 && <div className="li"><div className="t"><b>Aucun repas en attente</b><small>Toutes les réservations du jour sont servies</small></div></div>}
          </div>
          <AppButton
            label={sel ? `Remettre le repas à ${sel.student.name.split(' ')[0]}` : 'Sélectionnez un élève'}
            busyLabel="Validation…"
            doneLabel="Repas servi"
            className="btn p h-[60px] justify-center text-[17px]"
            onDone={collect}
          />
          <p className="text-[13px] leading-[19px] text-muted">Chaque validation est tracée (agent, heure) et rend le ticket inutilisable.</p>
        </form>
      </div>
    </>
  );
}
