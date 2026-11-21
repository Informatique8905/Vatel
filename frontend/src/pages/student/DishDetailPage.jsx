import Icon from '../../components/common/Icon';
import BackLink from '../../components/common/BackLink';

// Maquette : eleve-04-plat-allergene
export default function DishDetailPage() {
  return (
    <div className="flex flex-1 flex-col">
      <BackLink to="/student/menu" />

      <div className="flex flex-col items-center px-5 pt-1.5 text-center">
        <div className="w-[150px] h-[150px] rounded-[75px] bg-tint flex items-center justify-center">
          <span className="w-24 h-24 rounded-[48px] border-2 border-vatel bg-white box-content" />
        </div>
        <span className="text-[12px] font-semibold text-muted mt-2">Photo du plat</span>
        <span className="text-[15px] font-semibold text-muted mt-[18px]">Jeudi 26 novembre</span>
        <h1 className="mt-1.5 text-[30px] leading-[36px] font-black tracking-[-0.8px]">Foutou sauce arachide</h1>
        <span className="num text-[20px] font-extrabold text-marine mt-2">1 500 F</span>
      </div>

      <div role="alert" className="mx-5 mt-[26px] p-4 rounded-[14px] bg-danger-bg flex gap-3 items-start">
        <span className="text-danger"><Icon name="alert" sw={2.2} /></span>
        <div>
          <b className="text-[16px] text-danger">Contient de l'arachide</b>
          <div className="text-[15px] leading-[22px] mt-0.5">Allergie déclarée dans votre profil. La réservation est bloquée.</div>
        </div>
      </div>

      <div className="bg-white mt-[22px]">
        <div className="li justify-between text-[16px]"><span className="text-muted">Composition</span><span className="font-semibold text-right">Foutou banane, bœuf, gombo</span></div>
        <div className="li justify-between text-[16px]"><span className="text-muted">Allergènes</span><span className="font-bold">Arachide, céleri</span></div>
      </div>

      <div className="mt-auto px-5 pb-[34px] flex flex-col gap-3.5">
        <button type="button" disabled className="h-[58px] rounded-[14px] bg-line text-muted text-[17px] font-bold">Réservation indisponible</button>
        <a href="#" className="text-center text-[15px] font-bold no-underline text-marine">Signaler une erreur sur ce plat</a>
      </div>
    </div>
  );
}
