import { useState } from 'react';
import { SkeletonList, toastBus } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import {
  getSlots, createSlot, setSlotOpen, deleteSlot, todayKey, fmtDay, slotText, apiMessage,
} from '../../services/cantine';

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const nextDays = (from, n) => {
  const d = new Date(`${from}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10));
};

// Admin : créneaux de retrait. Sans créneau ouvert, aucun élève ne peut réserver.
export default function SlotsPage() {
  const [date, setDate] = useState(todayKey());
  const { data: slots, loading, reload } = useData(
    () => getSlots(`?date=${date}`).then((d) => d.slots),
    [date],
  );
  const [f, setF] = useState({ label: 'Déjeuner', start: '12:00', end: '13:00', capacity: 100, days: 1 });
  const [busy, setBusy] = useState(false);

  const act = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      toastBus.show(ok);
      reload();
    } catch (err) { toastBus.show(apiMessage(err)); }
    finally { setBusy(false); }
  };

  const create = () => {
    const startMinutes = toMinutes(f.start);
    const endMinutes = toMinutes(f.end);
    if (!f.label.trim() || endMinutes <= startMinutes) {
      toastBus.show('Libellé requis et heure de fin après l’heure de début');
      return;
    }
    const days = Math.max(1, Math.min(31, Number(f.days) || 1));
    const base = { label: f.label.trim(), startMinutes, endMinutes, capacity: Number(f.capacity) };
    act(
      () => createSlot(days === 1 ? { ...base, date } : { ...base, dates: nextDays(date, days) }),
      days === 1 ? 'Créneau créé' : `Créneaux créés sur ${days} jours`,
    );
  };

  const remove = (s) => {
    if (!window.confirm(`Supprimer le créneau « ${s.label} » ?`)) return;
    act(() => deleteSlot(s.id), 'Créneau supprimé');
  };

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">{fmtDay(date)}</span><h1 className="h1">Créneaux</h1></div>
        <div className="fld"><label htmlFor="sd">Jour</label><input id="sd" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
      </div>

      <div className="grid gap-9 mt-9 lg:grid-cols-[1fr_380px]">
        <div>
          {loading ? (
            <SkeletonList rows={3} width="640" avatars={false} />
          ) : (
            <div className="list">
              {(slots ?? []).map((s) => (
                <div key={s.id} className="li flex-wrap gap-3">
                  <div className="t flex-1 min-w-[180px]">
                    <b>{s.label} · <span className="num">{slotText(s)}</span></b>
                    <small className="num">{s.reservedCount}/{s.capacity} réservés · {s.isOpen ? 'Ouvert' : 'Fermé'}</small>
                  </div>
                  <button type="button" disabled={busy} className="btn s" onClick={() => act(() => setSlotOpen(s.id, !s.isOpen), s.isOpen ? 'Créneau fermé' : 'Créneau ouvert')}>
                    {s.isOpen ? 'Fermer' : 'Ouvrir'}
                  </button>
                  {s.reservedCount === 0 && (
                    <button type="button" disabled={busy} className="btn s text-danger" onClick={() => remove(s)}>Supprimer</button>
                  )}
                </div>
              ))}
              {(slots ?? []).length === 0 && (
                <div className="li"><div className="t"><b>Aucun créneau ce jour</b><small>Les élèves ne peuvent pas réserver sans créneau ouvert.</small></div></div>
              )}
            </div>
          )}
        </div>

        <form className="flex flex-col gap-[18px]" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <h2 className="h2 text-[22px]">Nouveau créneau</h2>
          <div className="fld"><label htmlFor="sl">Libellé</label><input id="sl" maxLength={80} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="fld"><label htmlFor="ss">Début</label><input id="ss" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div className="fld"><label htmlFor="se">Fin</label><input id="se" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="fld"><label htmlFor="sc">Capacité</label><input id="sc" className="num" type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
            <div className="fld"><label htmlFor="sn">Nombre de jours</label><input id="sn" className="num" type="number" min="1" max="31" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></div>
          </div>
          <button type="submit" disabled={busy} className="btn p justify-center">Créer à partir du {fmtDay(date)}</button>
        </form>
      </div>
    </>
  );
}
