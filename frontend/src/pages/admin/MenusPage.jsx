import { useState } from 'react';
import Icon from '../../components/common/Icon';
import { PopoverMenu, toastBus } from '../../components/common/kbr';

const TAGS = {
  served: { label: 'Servi', cls: 'bg-soft text-muted' },
  today: { label: 'Aujourd’hui', cls: 'bg-ok-bg text-ok' },
  published: { label: 'Publié', cls: 'bg-tint text-marine' },
  draft: { label: 'Brouillon', cls: 'bg-tint-yellow text-ink' },
};

const WEEK = [
  { d: 'Lun', n: '23', name: 'Riz sauce graine', sub: '1 500 F · Poisson', tag: 'served' },
  { d: 'Mar', n: '24', name: 'Attiéké poisson braisé', sub: '1 500 F · Poisson', tag: 'today', today: true },
  { d: 'Mer', n: '25', name: 'Alloco poulet braisé', sub: '1 750 F · Aucun allergène', tag: 'published' },
  { d: 'Jeu', n: '26', name: 'Foutou sauce arachide', sub: '1 500 F · Arachide, céleri', tag: 'published', danger: true },
  { d: 'Ven', n: '27', name: 'Kédjénou de poulet, riz', sub: '1 750 F · Allergènes non vérifiés', tag: 'draft', selected: true },
];

const ALLERGENS = ['Arachide', 'Poisson', 'Lait', 'Œufs', 'Gluten', 'Céleri', 'Sésame'];

// Maquette : admin-02-menus
export default function MenusPage() {
  const [al, setAl] = useState({});

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Semaine du 23 au 27 novembre</span><h1 className="h1">Menus</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <button type="button" className="btn s">Dupliquer la semaine</button>
          <button type="button" className="btn p"><Icon name="plus" />Nouveau plat</button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-10 mt-10 items-start">
        <div className="list">
          {WEEK.map((w) => (
            <a key={w.n} className={`li${w.selected ? ' bg-tint' : ''}`} href="#">
              <div className="w-[52px] text-center flex-none">
                <div className="text-[12px] font-bold text-muted uppercase">{w.d}</div>
                <div className={`num text-[22px] font-extrabold ${w.today ? 'text-marine' : 'text-ink'}`}>{w.n}</div>
              </div>
              <div className="t"><b>{w.name}</b><small className={`num ${w.danger ? 'text-danger' : 'text-muted'}`}>{w.sub}</small></div>
              <span className={`tag ${TAGS[w.tag].cls}`}>{TAGS[w.tag].label}</span>
              <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <PopoverMenu
                  title={`Plat du ${w.d} ${w.n}`}
                  items="Dupliquer,Modifier,Archiver"
                  danger-label="Supprimer"
                  onSelect={() => toastBus.show(`Action sur « ${w.name} »`)}
                />
              </span>
            </a>
          ))}
        </div>

        <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
          <div className="flex justify-between items-center"><h2 className="h2 text-[26px]">Vendredi 27</h2><span className="tag bg-tint-yellow text-ink">Brouillon</span></div>
          <button type="button" className="h-40 border border-dashed border-idle rounded-[16px] bg-white text-marine text-[15px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer">
            <Icon name="camera" />Ajouter une photo du plat
          </button>
          <div className="fld"><label htmlFor="n">Nom du plat</label><input id="n" defaultValue="Kédjénou de poulet, riz" /></div>
          <div className="fld"><label htmlFor="ds">Description</label><textarea id="ds" rows={2} defaultValue="Poulet mijoté à l'étouffée, aubergine, gombo, riz blanc." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="fld"><label htmlFor="p">Prix (FCFA)</label><input id="p" className="num" defaultValue="1 750" /></div>
            <div className="fld"><label htmlFor="c">Portions prévues</label><input id="c" className="num" defaultValue="260" /></div>
          </div>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-[14px] font-bold text-muted mb-2.5">Allergènes présents</legend>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={!!al[n]}
                  onClick={() => setAl({ ...al, [n]: !al[n] })}
                  className={`h-10 px-4 rounded-[20px] text-[15px] font-bold cursor-pointer border ${al[n] ? 'bg-marine text-white border-marine' : 'bg-white text-ink border-line'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex gap-3.5 items-start text-[15px] leading-[22px] cursor-pointer py-4 border-t border-line">
            <input type="checkbox" className="w-[22px] h-[22px] m-0 flex-none accent-marine" />
            <span><b>Allergènes vérifiés avec la cuisine.</b> Sans cette case, les élèves voient « informations non vérifiées ».</span>
          </label>
          <div className="flex gap-2.5 flex-wrap">
            <button type="button" className="btn p flex-1 justify-center">Publier le menu</button>
            <button type="button" className="btn s">Enregistrer</button>
          </div>
        </form>
      </div>
    </>
  );
}
