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

// Maquette : eleve-08-profil-alimentaire — enrichie : saisie d'allergies
// personnalisées, restrictions alimentaires et déconnexion (spec §7, §12).
export default function DietaryProfilePage() {
  const navigate = useNavigate();
  const [sel, setSel] = useState({ Arachide: true });
  const [custom, setCustom] = useState([]);
  const [input, setInput] = useState('');
  const [rest, setRest] = useState({});

  const allergyCount = [...KNOWN_ALLERGIES, ...custom].filter((n) => sel[n]).length;
  const restCount = RESTRICTIONS.filter((r) => rest[r]).length;

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

      {/* ---------- Allergies déclarées ---------- */}
      <div className="px-5 pt-[26px] pb-2.5 flex justify-between items-baseline">
        <h2 className="h2">Allergies</h2>
        <span className="num text-[14px] font-bold text-muted">{allergyCount === 0 ? 'Aucune' : allergyCount === 1 ? '1 déclarée' : `${allergyCount} déclarées`}</span>
      </div>
      <div className="px-5 flex flex-col gap-2.5 items-center">
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
        <form onSubmit={addAllergy} className="w-full flex gap-2">
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
      <p className="mx-5 mt-3 text-[13px] leading-[19px] text-muted">Un plat qui contient une allergie cochée ne peut pas être réservé. Si la composition d'un plat n'est pas renseignée, il est marqué « non vérifié ».</p>

      {/* ---------- Restrictions alimentaires ---------- */}
      <div className="px-5 pt-[26px] pb-2.5 flex justify-between items-baseline">
        <h2 className="h2">Restrictions</h2>
        <span className="num text-[14px] font-bold text-muted">{restCount === 0 ? 'Aucune' : restCount === 1 ? '1 active' : `${restCount} actives`}</span>
      </div>
      <div className="list">
        {RESTRICTIONS.map((r) => (
          <div key={r} className="li">
            <span className="flex-1 text-[16px] font-bold">{r}</span>
            <Toggle checked={!!rest[r]} onChange={() => setRest({ ...rest, [r]: !rest[r] })} label={r} />
          </div>
        ))}
      </div>
      <p className="mx-5 mt-3 text-[13px] leading-[19px] text-muted">Une restriction déclarée affiche un avertissement sur les plats concernés, sans bloquer la réservation.</p>

      {/* ---------- Compte ---------- */}
      <div className="px-5 pt-[26px] pb-2.5"><h2 className="h2">Compte</h2></div>
      <div className="list">
        <div className="li">
          <span className="flex-1 text-[16px] font-bold">E-mail</span>
          <span className="num text-[15px] text-muted">aya.konan@exemple.ci</span>
        </div>
        <button
          type="button"
          onClick={() => {
            toastBus.show('Déconnexion…');
            navigate('/connexion');
          }}
          className="li w-full border-0 bg-white text-left cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        >
          <span className="w-10 h-10 rounded-[12px] bg-danger-bg text-danger flex items-center justify-center flex-none"><Icon name="logout" size={20} /></span>
          <span className="flex-1 text-[16px] font-bold text-danger">Se déconnecter</span>
          <Icon name="chevronRight" size={20} className="text-muted" />
        </button>
      </div>
      <p className="mt-5 text-center text-[13px] font-semibold text-muted">Ma Cantine · démo — données fictives</p>
    </div>
  );
}
