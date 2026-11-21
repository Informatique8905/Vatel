import AvatarLink from '../../components/common/AvatarLink';
import FakeQr from '../../components/student/FakeQr';

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

      <div className="bg-white mt-[22px]">
        <div className="li justify-between text-[16px]"><span className="text-muted">Créneau</span><b className="num">12:45 – 13:15</b></div>
        <div className="li justify-between text-[16px]"><span className="text-muted">Code de secours</span><b className="num font-mono text-marine">VTL-4821</b></div>
        <div className="li justify-between text-[16px]"><span className="text-muted">Statut</span><b className="text-ok">Payé</b></div>
      </div>
    </div>
  );
}
