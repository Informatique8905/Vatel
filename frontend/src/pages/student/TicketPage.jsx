import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import AvatarLink from '../../components/common/AvatarLink';
import { TicketCard, CopyChip, toastBus } from '../../components/common/kbr';
import { PageLoader } from '../../components/common/Loader';
import { useData } from '../../hooks/useData';
import { getReservations, getReservation, slotText, fmtDay, cancelReservation } from '../../services/cantine';
import { formatF } from '../../utils/format';

// Ticket QR réel : le qrToken opaque (usage unique §6) est encodé dans
// l'image. `:id` optionnel — sinon la réservation CONFIRMED la plus récente.
export default function TicketPage() {
  const { id } = useParams();
  const { data: r, loading } = useData(async () => {
    if (id) return (await getReservation(id)).reservation;
    const { reservations } = await getReservations('?status=CONFIRMED&pageSize=1');
    return reservations?.[0] ?? null;
  }, [id]);

  const [qr, setQr] = useState(null);
  useEffect(() => {
    if (!r?.qrToken) { setQr(null); return; }
    QRCode.toDataURL(r.qrToken, { margin: 1, width: 240, color: { dark: '#1D1D1B', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [r?.qrToken]);

  if (loading) return <PageLoader fill="100dvh" />;

  if (!r) {
    return (
      <div>
        <div className="px-5 pt-[52px]"><AvatarLink to="/student/profil" label="Profil" /><h1 className="mt-[22px] text-[34px] leading-[40px] font-black tracking-[-1px]">Mon ticket</h1></div>
        <p className="px-8 pt-16 text-center text-[16px] font-semibold text-muted">Aucune réservation confirmée — réservez votre repas pour obtenir un ticket.</p>
      </div>
    );
  }

  const code = r.qrToken ? r.qrToken.slice(-6).toUpperCase() : r.id.slice(-6).toUpperCase();

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink to="/student/profil" label="Profil" />
        <h1 className="mt-[22px] text-[34px] leading-[40px] font-black tracking-[-1px]">Mon ticket</h1>
      </div>

      <div className="flex flex-col items-center px-5 pt-[22px] text-center">
        <div className="bg-white border border-line rounded-[20px] p-[18px]">
          {qr ? <img src={qr} alt="QR du ticket" className="w-[220px] h-[220px]" /> : <div className="w-[220px] h-[220px] bg-tint rounded-[12px]" />}
        </div>
        <b className="text-[20px] font-extrabold mt-[18px]">{r.menuItem.dish.name}</b>
        <span className="text-[15px] text-muted mt-1">Usage unique · présentez-le au comptoir</span>
      </div>

      <div className="px-5 mt-[22px]">
        <TicketCard
          kicker="Ma Cantine · Vatel"
          title={r.menuItem.dish.name}
          venue="Réfectoire"
          rows={[
            ['Date', fmtDay(r.menuItem.date)],
            ['Créneau', slotText(r.timeSlot)],
            ['Référence', code],
            ['Prix', formatF(r.priceSnapshot)],
          ]}
          admit="Ticket repas"
          code={code}
        />
        {r.qrToken && (
          <div className="mt-5 flex justify-center">
            <CopyChip value={r.qrToken} label="Copier le jeton" onCopy={() => toastBus.show('Jeton du ticket copié')} />
          </div>
        )}
        {r.status === 'CONFIRMED' && (
          <button
            type="button"
            onClick={async () => {
              try {
                await cancelReservation(r.id);
                toastBus.show('Réservation annulée et remboursée');
                window.location.assign('/student');
              } catch (e) { toastBus.show(e.message ?? 'Annulation impossible'); }
            }}
            className="mx-auto mt-4 block text-[15px] font-bold text-danger bg-transparent border-0 cursor-pointer"
          >
            Annuler la réservation
          </button>
        )}
      </div>
    </div>
  );
}
