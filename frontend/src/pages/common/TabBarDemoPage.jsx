import { useState } from 'react';
import MobileShell from '../../components/common/MobileShell';
import LiquidTabBar from '../../components/common/LiquidTabBar';
import Icon from '../../components/common/Icon';

const ITEMS = [
  { icon: 'home', label: 'Accueil' },
  { icon: 'calendar', label: 'Menu' },
  { icon: 'qr', label: 'Ticket' },
  { icon: 'wallet', label: 'Solde' },
  { icon: 'user', label: 'Profil' },
];

// Écran de démo de la tab bar liquide (mode contrôlé index/onChange).
// Le fond marine remonte sous la barre pour être visible dans le creux.
export default function TabBarDemoPage() {
  const [index, setIndex] = useState(0);
  return (
    <MobileShell tabBar={<LiquidTabBar items={ITEMS} index={index} onChange={setIndex} />}>
      <div className="flex flex-col flex-1 -mb-[86px] pb-[150px]" style={{ background: '#072A5D' }}>
        <div className="px-5 pt-[52px]">
          <span className="text-[15px] font-semibold" style={{ color: '#67B2E8' }}>
            Cantine Vatel — démo
          </span>
          <h1 className="h1 text-white mt-1.5">Tab bar liquide</h1>
          <p className="text-[15px] leading-[22px] mt-3" style={{ color: '#B7D6F0' }}>
            L'onglet actif sort de la barre dans une bulle. Au tap : plongée, glissement du creux
            avec ressort amorti et sillage, puis sortie de la nouvelle bulle. L'animation est
            interruptible à tout moment — essayez de taper pendant le glissement.
          </p>
        </div>
        <div className="px-5 mt-8 flex flex-col gap-3">
          {ITEMS.map((it, i) => (
            <button
              key={it.label}
              type="button"
              onClick={() => setIndex(i)}
              className="flex items-center gap-4 rounded-2xl px-5 py-4 text-left font-inherit"
              style={{
                background: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                color: i === index ? '#072A5D' : '#B7D6F0',
                border: 0,
                cursor: 'pointer',
              }}
            >
              <Icon name={it.icon} />
              <span className="text-[16px] font-bold flex-1">{it.label}</span>
              {i === index && <span className="text-[12px] font-bold" style={{ color: '#2B85BB' }}>ACTIF</span>}
            </button>
          ))}
        </div>
        <p className="px-5 mt-auto text-[13px] font-semibold" style={{ color: '#67B2E8' }}>
          Le fond bleu remonte sous la barre : il est visible dans le creux de l'encoche.
        </p>
      </div>
    </MobileShell>
  );
}
