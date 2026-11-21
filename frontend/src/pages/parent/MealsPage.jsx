import { useState } from 'react';
import AvatarLink from '../../components/common/AvatarLink';
import { VatelSegmented, RollText } from '../../components/common/kbr';

const KIDS = [
  { id: 'aya', label: 'Aya' },
  { id: 'yao', label: 'Yao' },
];

const DATA = {
  aya: {
    stats: [['12', 'servis', '#1D1D1B'], ['1', 'non récupéré', '#B42318'], ['19 500 F', 'dépensés', '#1D1D1B']],
    rows: [
      ['Attiéké poisson braisé', 'Mar. 24 · 12:45 – 13:15', 'Réservé', '#072A5D'],
      ['Riz sauce graine', 'Lun. 23 · 12:15 – 12:45', 'Servi', '#1E7F4F'],
      ['Placali sauce kopè', 'Ven. 20 · 11:45 – 12:15', 'Servi', '#1E7F4F'],
      ['Alloco poisson', 'Mer. 18 · 12:45 – 13:15', 'Non récupéré', '#B42318'],
    ],
  },
  yao: {
    stats: [['9', 'servis', '#1D1D1B'], ['0', 'non récupéré', '#1D1D1B'], ['14 000 F', 'dépensés', '#1D1D1B']],
    rows: [
      ['Aucune réservation', 'Mar. 24 · solde insuffisant', 'Solde bas', '#B42318'],
      ['Riz sauce graine', 'Lun. 23 · 11:45 – 12:15', 'Servi', '#1E7F4F'],
      ['Placali sauce kopè', 'Ven. 20 · 12:15 – 12:45', 'Servi', '#1E7F4F'],
      ['Garba', 'Jeu. 19 · 13:15 – 13:45', 'Annulé, remboursé', '#5C5C5C'],
    ],
  },
};

// Maquette : parent-03-suivi
export default function MealsPage() {
  const [kid, setKid] = useState('aya');
  const d = DATA[kid];

  return (
    <div>
      <div className="px-5 pt-[52px]">
        <AvatarLink label="Compte" />
        <h1 className="h1 mt-[22px]">Repas</h1>
        <div className="mt-4"><VatelSegmented options={KIDS} value={kid} onChange={setKid} label="Enfant" /></div>
      </div>

      <div className="flex px-5 pt-6">
        {d.stats.map(([v, l, color], i) => (
          <div key={l} className={`flex-[1_1_auto] flex flex-col gap-0.5 ${i > 0 ? 'pl-4 border-l border-line ml-4' : ''}`}>
            <RollText className="num text-[24px] leading-[30px] font-black tracking-[-0.6px] whitespace-nowrap" style={{ color }} text={v} />
            <span className="text-[13px] font-semibold text-muted">{l}</span>
          </div>
        ))}
      </div>

      <div className="px-5 pt-7 pb-2.5 flex justify-between items-baseline">
        <h2 className="h2">Novembre</h2>
        <span className="text-[14px] font-bold text-muted">Cette semaine</span>
      </div>
      <div className="list">
        {d.rows.map(([dish, when, status, color]) => (
          <div key={dish + when} className="li py-3.5">
            <div className="t"><b>{dish}</b><small>{when}</small></div>
            <span className="text-[14px] font-bold whitespace-nowrap" style={{ color }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
