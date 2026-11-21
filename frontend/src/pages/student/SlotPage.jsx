import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackLink from '../../components/common/BackLink';
import RadioDot from '../../components/common/RadioDot';
import { HoldButton, toastBus } from '../../components/common/kbr';
import { PageLoader, LoadingOverlay } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import {
  getMenuItem, getMenuItems, getSlots, getWallet, createReservation,
  todayKey, fmtDay, slotText, apiMessage,
} from '../../services/cantine';
import { formatF } from '../../utils/format';

// Clé d'idempotence unique par tentative : un double-clic ne débite jamais
// deux fois (le backend rejoue la même réservation sur la même clé).
const idemKey = () => crypto.randomUUID();

// Choix du créneau + réservation atomique (débit wallet côté serveur).
// `?item=<menuItemId>` vient du menu ou de la fiche plat ; sinon 1re offre du jour.
export default function SlotPage() {
  const [params] = useSearchParams();
  const itemId = params.get('item');
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const { data: item, loading: li } = useData(async () => {
    if (itemId) return (await getMenuItem(itemId)).item;
    const { items } = await getMenuItems(`?date=${todayKey()}`);
    return items?.[0] ?? null;
  }, [itemId]);

  const { data: slots } = useData(
    () => (item ? getSlots(`?date=${item.date.slice(0, 10)}`).then((d) => d.slots) : Promise.resolve([])),
    [item?.id],
  );
  const {
    data: wallet,
    loading: walletLoading,
    error: walletError,
    reload: reloadWallet,
  } = useData(() => getWallet().then((d) => d.wallet), []);

  const [sel, setSel] = useState(null);
  const usable = useMemo(() => (slots ?? []).filter((s) => s.isOpen && s.remaining > 0), [slots]);
  const cur = usable.find((s) => s.id === sel) ?? usable[0];
  const balance = wallet?.balance ?? 0;
  const price = item?.price ?? 0;
  const notEnough = Boolean(wallet && item && balance < price);
  const blocked = item?.allergenAlert;

  const confirm = async () => {
    if (!cur || !item || paying) return false;
    setPaying(true);
    try {
      const { reservation } = await createReservation({
        menuItemId: item.id,
        timeSlotId: cur.id,
        idempotencyKey: idemKey(),
      });
      toastBus.show(`Réservation confirmée · −${formatF(reservation.priceSnapshot)}`);
      navigate(`/student/ticket/${reservation.id}`);
    } catch (err) {
      toastBus.show(apiMessage(err));
      setPaying(false);
      return false;
    }
  };

  if (li) return <div className="flex flex-1"><BackLink to="/student" /><PageLoader /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <BackLink to="/student" />
      <div className="px-5 pt-2">
        <h1 className="text-[34px] leading-[40px] font-black tracking-[-1px]">Choisir un créneau</h1>
        <p className="mt-2 text-[16px] text-muted capitalize">
          {item ? `${item.dish.name} · ${fmtDay(item.date)}` : 'Aucune offre publiée aujourd’hui'}
        </p>
      </div>

      {blocked && (
        <div role="alert" className="mx-5 mt-4 p-4 rounded-[14px] bg-danger-bg text-[15px] leading-[21px]">
          <b className="text-danger">Réservation bloquée.</b> Ce plat contient {item.matchedAllergens.map((a) => `de la ${a.name}`).join(', ')} — allergie déclarée dans votre profil.
        </div>
      )}

      <div role="radiogroup" aria-label="Créneaux" className="mt-[22px]">
        {(slots ?? []).map((s) => {
          const full = s.remaining <= 0 || !s.isOpen;
          const on = cur?.id === s.id && !full;
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
              <span className="num flex-1 text-[18px] font-bold">{s.label ?? slotText(s)}</span>
              <span className={`num text-[15px] font-semibold ${!full && s.remaining <= 5 ? 'text-danger' : 'text-muted'}`}>
                {full ? 'Complet' : `${s.remaining} places`}
              </span>
            </button>
          );
        })}
        {slots && slots.length === 0 && (
          <p className="px-5 py-6 text-center text-[15px] font-semibold text-muted">Aucun créneau ouvert pour ce jour.</p>
        )}
      </div>

      <div className="mt-auto px-5 pb-[34px]">
        <div className="sum"><span className="text-muted">Solde actuel</span><span className="num font-semibold">{wallet ? formatF(balance) : walletError ? '—' : '…'}</span></div>
        <div className="sum"><span className="text-muted">Repas</span><span className="num font-semibold">−{formatF(price)}</span></div>
        <div className="sum border-t border-line mt-1.5 pt-3.5">
          <b>Solde après</b>
          <b className={`num ${notEnough ? 'text-danger' : ''}`}>{wallet ? formatF(balance - price) : walletError ? '—' : '…'}</b>
        </div>
        {walletError && (
          <p role="alert" className="mt-2 text-center text-[14px] font-semibold text-danger">
            Solde indisponible.{' '}
            <button type="button" className="text-marine underline" onClick={() => reloadWallet()}>Réessayer</button>
          </p>
        )}
        {notEnough && <p className="mt-2 text-center text-[14px] font-semibold text-danger">Solde insuffisant — demandez une recharge à votre parent.</p>}
        <div className="mt-5">
          {!item || !cur || !wallet || walletLoading || walletError || notEnough || blocked ? (
            <button type="button" disabled className="primary h-[58px] w-full justify-center opacity-50">
              {walletError ? 'Solde indisponible' : walletLoading || !wallet ? 'Chargement du solde…' : !item || !cur ? 'Indisponible' : notEnough ? 'Solde insuffisant' : 'Réservation bloquée'}
            </button>
          ) : (
            <HoldButton
              label={`Maintenir pour payer ${formatF(price)}`}
              doneLabel="Réservé !"
              holdMs={900}
              onConfirm={confirm}
            />
          )}
        </div>
        <p className="mt-3.5 text-center text-[13px] text-muted">Annulation remboursée avant l’heure limite.</p>
      </div>
      {paying && <LoadingOverlay label="Paiement en cours…" />}
    </div>
  );
}
