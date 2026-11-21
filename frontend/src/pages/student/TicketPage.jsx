import AvatarLink from '../../components/common/AvatarLink';
import FakeQr from '../../components/student/FakeQr';
import { TicketCard, CopyChip, toastBus } from '../../components/common/kbr';

// Maquette : eleve-06-ticket-qr
export default function TicketPage() {
  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink to="/student/profil" label="Profil" />
        <h1 className="mt-[22px] text-[34px] leading-[40px] font-black tracking-[-1px]">Mon ticket</h1>
      </div>

      <div className="flex flex-col items-center px-5 pt-[22px] text-center">
        <div className="bg-white border border-line rounded-[20px] p-[18px]"><FakeQr /></div>
        <b className="text-[20px] font-extrabold mt-[18px]">Attiéké poisson braisé</b>
        <span className="text-[15px] text-muted mt-1">Usage unique · présentez-le au comptoir</span>
      </div>

      <div className="px-5 mt-[22px]">
        <TicketCard
          kicker="Ma Cantine · Vatel"
          title="Attiéké poisson braisé"
          venue="Réfectoire · Comptoir 1"
          rows={[['Créneau', '12:45 – 13:15'], ['Code de secours', 'VTL-4821'], ['Prix', '1 500 F']]}
          admit="Aya Konan"
          code="VTL-4821"
          onTear={() => toastBus.show('Ticket présenté au comptoir · remise du repas')}
        />
        <div className="mt-5 flex justify-center">
          <CopyChip value="VTL-4821" label="Copier le code" onCopy={() => toastBus.show('Code de secours copié')} />
        </div>
      </div>
    </div>
  );
}
