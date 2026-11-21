import { useState } from 'react';
import Icon from '../../components/common/Icon';
import { AllergyRow } from '../../components/common/kbr';

const ALLERGIES = ['Arachide', 'Lait', 'Gluten', 'Œuf', 'Fruits de mer', 'Sésame'];

// Maquette : eleve-08-profil-alimentaire
export default function DietaryProfilePage() {
  const [sel, setSel] = useState({ Arachide: true });
  const count = ALLERGIES.filter((n) => sel[n]).length;

  return (
    <div>
      <div className="flex flex-col items-center px-5 pt-[52px] text-center">
        <span className="w-[84px] h-[84px] rounded-[42px] bg-tint text-marine flex items-center justify-center text-[30px] font-extrabold">AK</span>
        <b className="text-[24px] font-black tracking-[-0.5px] mt-3.5">Aya Konan</b>
        <span className="num text-[15px] text-muted mt-1">Bachelor 2 · VTL-2024-118</span>
      </div>

      <div className="px-5 pt-[26px] pb-2.5 flex justify-between items-baseline">
        <h2 className="h2">Allergies</h2>
        <span className="num text-[14px] font-bold text-muted">{count === 0 ? 'Aucune' : count === 1 ? '1 déclarée' : `${count} déclarées`}</span>
      </div>
      <div className="px-5 flex flex-col gap-2.5 items-center">
        {ALLERGIES.map((n) => (
          <AllergyRow
            key={n}
            name={n}
            checked={!!sel[n]}
            onChange={(on) => setSel({ ...sel, [n]: on })}
          />
        ))}
      </div>

      <div className="list mt-[18px]">
        <a className="li" href="#">
          <span className="flex-1 text-[16px] font-bold">Régime</span>
          <span className="text-[15px] text-muted">Aucun</span>
          <Icon name="chevronRight" size={20} className="text-muted" />
        </a>
      </div>
      <p className="mx-5 mt-3 text-[13px] leading-[19px] text-muted">Un plat qui contient une allergie cochée ne peut pas être réservé. Si la composition d'un plat n'est pas renseignée, il est marqué « non vérifié ».</p>
    </div>
  );
}
