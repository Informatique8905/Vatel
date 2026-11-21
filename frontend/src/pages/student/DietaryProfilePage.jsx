import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import Toggle from '../../components/common/Toggle';
import { AllergyRow, toastBus } from '../../components/common/kbr';

// Référentiel d'allergies connu de la cantine (spec §7 : les allergies
// déclarées bloquent la réservation en cas de correspondance).
const KNOWN_ALLERGIES = ['Arachide', 'Lait', 'Gluten', 'Œuf', 'Fruits de mer', 'Sésame'];

// Référentiel de restrictions alimentaires (spec §7 : affichage d'un
// avertissement sur les plats concernés, sans blocage automatique).
const RESTRICTIONS = ['Végétarien', 'Halal', 'Sans porc'];

// Section repliable : ligne compacte (icône + titre + résumé + chevron) qui
// dévoile son contenu au clic ; une seule section ouverte à la fois.
function AccItem({ icon, tone, title, sub, open, onToggle, children }) {
  return (
    <div className={`pacc${open ? ' open' : ''}`}>
      <button type="button" className="pacc-head" aria-expanded={open} onClick={onToggle}>
        <span className={`pacc-ic ${tone}`}><Icon name={icon} size={20} /></span>
        <span className="pacc-t"><b>{title}</b><small>{sub}</small></span>
        <Icon name="chevronRight" size={18} className="pchv" />
      </button>
      <div className="pacc-body"><div>{children}</div></div>
    </div>
  );
}

// Maquette : eleve-08-profil-alimentaire — réorganisée en liste repliable
// (spec §7, §12) : le détail d'une section n'occupe la page qu'à la demande.
export default function DietaryProfilePage() {
  const navigate = useNavigate();
  const [sel, setSel] = useState({ Arachide: true });
  const [custom, setCustom] = useState([]);
  const [input, setInput] = useState('');
  const [rest, setRest] = useState({});
  const [open, setOpen] = useState('allergies');

  const allergyCount = [...KNOWN_ALLERGIES, ...custom].filter((n) => sel[n]).length;
  const restCount = RESTRICTIONS.filter((r) => rest[r]).length;
  const toggle = (key) => setOpen((o) => (o === key ? null : key));

  const addAllergy = (e) => {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    const exists = [...KNOWN_ALLERGIES, ...custom].some((n) => n.toLowerCase() === name.toLowerCase());
    if (exists) {
      toastBus.show(`« ${name} » est déjà dans votre liste`);
    } else {
      setCustom([...custom, name]);
      setSel({ ...sel, [name]: true });
      toastBus.show(`Allergie « ${name} » ajoutée`);
    }
    setInput('');
  };

  const removeAllergy = (name) => {
    setCustom(custom.filter((n) => n !== name));
    const next = { ...sel };
    delete next[name];
    setSel(next);
  };

  return (
    <div className="pb-8">
      <div className="flex flex-col items-center px-5 pt-[52px] text-center">
        <span className="pop-in w-[84px] h-[84px] rounded-[42px] bg-tint text-marine flex items-center justify-center text-[30px] font-extrabold">AK</span>
        <b className="text-[24px] font-black tracking-[-0.5px] mt-3.5">Aya Konan</b>
        <span className="num text-[15px] text-muted mt-1">Bachelor 2 · VTL-2024-118</span>
      </div>

      <div className="px-5 mt-7">
        <div className="plist">
          <AccItem
            icon="shield"
            tone="red"
            title="Allergies"
            sub={allergyCount === 0 ? 'Aucune déclarée' : allergyCount === 1 ? '1 déclarée · bloque la réservation' : `${allergyCount} déclarées · bloque la réservation`}
            open={open === 'allergies'}
            onToggle={() => toggle('allergies')}
          >
            <div className="pacc-in">
              <div className="flex flex-col gap-2.5">
                {KNOWN_ALLERGIES.map((n) => (
                  <AllergyRow
                    key={n}
                    name={n}
                    checked={!!sel[n]}
                    onChange={(on) => setSel({ ...sel, [n]: on })}
                  />
                ))}
                {custom.map((n) => (
                  <AllergyRow
                    key={n}
                    name={n}
                    checked={!!sel[n]}
                    onChange={(on) => setSel({ ...sel, [n]: on })}
                    onRemove={() => removeAllergy(n)}
                  />
                ))}
                <form onSubmit={addAllergy} className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Autre allergie à déclarer…"
                    aria-label="Autre allergie à déclarer"
                    className="flex-1 h-12 rounded-[12px] border border-line bg-white px-4 text-[15px] font-semibold text-ink outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Ajouter cette allergie"
                    className="w-12 h-12 rounded-[12px] bg-marine text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-40"
                  >
                    <Icon name="plus" />
                  </button>
                </form>
              </div>
              <p className="phint">Un plat qui contient une allergie cochée ne peut pas être réservé. Si la composition d'un plat n'est pas renseignée, il est marqué « non vérifié ».</p>
            </div>
          </AccItem>

          <AccItem
            icon="list"
            tone="blue"
            title="Restrictions"
            sub={restCount === 0 ? 'Aucune active' : restCount === 1 ? '1 active · avertissement affiché' : `${restCount} actives · avertissement affiché`}
            open={open === 'restrictions'}
            onToggle={() => toggle('restrictions')}
          >
            <div className="pacc-in">
              {RESTRICTIONS.map((r) => (
                <div key={r} className="prow">
                  <span className="text-[15px] font-bold">{r}</span>
                  <Toggle checked={!!rest[r]} onChange={() => setRest({ ...rest, [r]: !rest[r] })} label={r} />
                </div>
              ))}
              <p className="phint">Une restriction déclarée affiche un avertissement sur les plats concernés, sans bloquer la réservation.</p>
            </div>
          </AccItem>

          <AccItem
            icon="user"
            tone="grey"
            title="Compte"
            sub="aya.konan@exemple.ci"
            open={open === 'compte'}
            onToggle={() => toggle('compte')}
          >
            <div className="pacc-in">
              <div className="prow"><span className="text-[15px] font-bold">E-mail</span><span className="num text-[14px] text-muted">aya.konan@exemple.ci</span></div>
              <div className="prow"><span className="text-[15px] font-bold">Matricule</span><span className="num text-[14px] text-muted">VTL-2024-118</span></div>
              <div className="prow"><span className="text-[15px] font-bold">Promotion</span><span className="num text-[14px] text-muted">Bachelor 2</span></div>
            </div>
          </AccItem>

          <button
            type="button"
            onClick={() => {
              toastBus.show('Déconnexion…');
              navigate('/connexion');
            }}
            className="pacc-head plogout"
          >
            <span className="pacc-ic red"><Icon name="logout" size={20} /></span>
            <span className="pacc-t"><b className="text-danger">Se déconnecter</b><small>Retour à l'écran de connexion</small></span>
            <Icon name="chevronRight" size={18} className="pchv" />
          </button>
        </div>
      </div>

      <p className="mt-5 text-center text-[13px] font-semibold text-muted">Ma Cantine · démo — données fictives</p>
    </div>
  );
}
