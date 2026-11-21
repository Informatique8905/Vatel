import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Toggle from './Toggle';

// Intégration des web components KBR-UI (ui.rodolphekouadio.com), chargés via
// index.html depuis /vendor/kbr/. Chaque wrapper expose props + événements en
// API React. Le thème reprend la palette exacte des maquettes cantine.
const KBR = {
  primary: '#072A5D',       // marine — boutons et remplissages
  'on-primary': '#FFFFFF',
  accent: '#2B85BB',        // vatel2
  'accent-tint': '#E8F3FC', // tint
  success: '#1E7F4F',       // ok
  danger: '#B42318',
  'danger-tint': '#FFECEC',
  surface: '#FFFFFF',
  ink: '#1D1D1B',
  'ink-2': '#5C5C5C',       // muted
  focus: '#2B85BB',
  highlight: '#E8F3FC',
};

const useEvent = (ref, name, handler) => {
  useEffect(() => {
    const el = ref.current;
    if (!el || !handler) return undefined;
    el.addEventListener(name, handler);
    return () => el.removeEventListener(name, handler);
  }, [name, handler]);
};

// --- Toasts globaux : toastBus.show('…') depuis n'importe quel écran ---
export const toastBus = {
  show(message) {
    window.dispatchEvent(new CustomEvent('vatel:toast', { detail: message }));
  },
};

export function ToastHost() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    let timer;
    const onToast = (e) => {
      clearTimeout(timer);
      setToast({ id: Date.now(), message: String(e.detail ?? '') });
      timer = setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('vatel:toast', onToast);
    return () => { clearTimeout(timer); window.removeEventListener('vatel:toast', onToast); };
  }, []);
  return (
    <div aria-live="polite" className="fixed inset-x-0 bottom-[96px] z-[1000] flex justify-center px-5 pointer-events-none">
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="vtoast max-w-[420px] rounded-[16px] bg-marine px-4 py-3 text-[15px] leading-[21px] font-semibold text-white shadow-lg pointer-events-auto"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Maintenir pour confirmer — actions sensibles (débit portefeuille, §9 UX).
export function HoldToConfirm({ onConfirm, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'confirm', onConfirm);
  return (
    <hold-to-confirm
      ref={ref}
      size="58"
      surface="#F9F9F9"
      {...KBR}
      {...props}
    />
  );
}

// Bouton à états racontés : action → en cours → réussi/échoué.
export function ActionButton({ onDone, onFail, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'done', onDone);
  useEvent(ref, 'fail', onFail);
  return <action-button ref={ref} size="58" {...KBR} {...props} />;
}

// Contrôle segmenté animé — look .seg des maquettes (piste #EDEDED, pilule blanche).
export function SegmentedControl({ options, value, onChange, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'change', (e) => {
    const d = e.detail;
    const idx = typeof d === 'number' ? d : d?.index ?? options.findIndex(
      (o) => o.id === d || o.id === d?.value || o.label === d || o.label === d?.value || o.label === d?.label,
    );
    if (idx >= 0) onChange?.(options[idx].id);
  });
  const sel = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <segmented-control
      ref={ref}
      options={options.map((o) => o.label).join(',')}
      selected={String(sel)}
      surface="#EDEDED"
      indicator="#FFFFFF"
      ink="#1D1D1B"
      ink-2="#5C5C5C"
      size="44"
      {...props}
    />
  );
}

// Interrupteur + volet : la ligne grandit en carte d'options quand activée.
export function SwitchRow({ checked, onChange, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'change', (e) => {
    const d = e.detail;
    onChange?.(typeof d === 'boolean' ? d : d?.checked ?? d?.on ?? !checked);
  });
  return (
    <switch-row
      ref={ref}
      checked={checked || undefined}
      on="#072A5D"
      check="#072A5D"
      check-ink="#FFFFFF"
      width="350"
      {...KBR}
      {...props}
    />
  );
}

// Saisie de code : cases animées, succès vert, erreur qui tremble.
export function CodeInput({ onComplete, onVerified, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'complete', (e) => onComplete?.(e.detail));
  useEvent(ref, 'verified', (e) => onVerified?.(e.detail));
  return <code-input ref={ref} {...KBR} {...props} />;
}

// Squelette de chargement aux couleurs de la page.
export function SkeletonList({ rows = 4, ...props }) {
  return <skeleton-list ref={undefined} rows={String(rows)} bone="#F2F2F2" shine="#FFFFFF" surface="#F9F9F9" {...props} />;
}

// Ticket détachable.
export function TearTicket({ onTear, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'tear', onTear);
  return <tear-ticket ref={ref} stub-paper="#F9F9F9" {...KBR} {...props} />;
}

// Recherche extensible (admin).
export function ExpandingSearch({ items = [], onSelect, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'select', (e) => onSelect?.(e.detail));
  return <expanding-search ref={ref} items={items.join(',')} {...KBR} {...props} />;
}

// Champ mot de passe : points → lettres, jauge Faible → Fort.
export function PasswordField(props) {
  return <password-field width="350" weak="#FF5959" fair="#FDCA12" good="#67B2E8" strong="#1E7F4F" {...KBR} {...props} />;
}

// Bouton copier : Copier → Copié, la valeur brille une fois.
export function CopyButton({ onCopy, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'copy', onCopy);
  return <copy-button ref={ref} {...KBR} {...props} />;
}

// Pilule de statut avec anneau de progression.
export function StatusPill(props) {
  return <status-pill {...KBR} {...props} />;
}

// Menu ⋮ qui grandit en liste d'actions (admin).
export function PopoverMenu({ onSelect, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'select', (e) => onSelect?.(e.detail));
  return <popover-menu ref={ref} align="end" {...KBR} {...props} />;
}

// Bouton de progression : action → capsule de progression → coche.
export function ProgressButton({ onDone, ...props }) {
  const ref = useRef(null);
  useEvent(ref, 'done', onDone);
  return <progress-button ref={ref} {...KBR} {...props} />;
}

// Accordéon : la question s'ouvre sur la réponse.
export function AccordionList(props) {
  return <accordion-list open-fill="#E8F3FC" {...KBR} {...props} />;
}

// Texte à lettres roulées : seuls les caractères qui changent bougent
// (montants, compteurs, soldes). Rendu React pur : le composant custom
// roll-text perdait son attribut text en prod (libellés vides).
export function RollText({ text, className = '', style }) {
  const value = String(text ?? '');
  return (
    <span className={`vroll ${className}`} style={style} role="text" aria-label={value}>
      {[...value].map((ch, i) => (
        <span key={`${i}-${ch}`} className="vroll-c" aria-hidden="true">
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      ))}
    </span>
  );
}

// --- Composants maison : animations KBR-UI reproduites dans le look des
// maquettes, quand la bibliothèque n'a pas de version cohérente. ---

// Champ mot de passe (<vatel-pass>) : strictement le look .fld input, mais
// les points se décomposent en lettres à la bascule œil (stagger), chaque
// caractère tapé « pop », jauge optionnelle Faible → Fort.
export function PasswordInput({ label, placeholder, meter = false, onChange, ...props }) {
  const ref = useRef(null);
  // L'événement input natif du champ interne traverse le shadow DOM (composed)
  // sans detail : on ne garde que le CustomEvent émis par <vatel-pass>.
  useEvent(ref, 'input', (e) => {
    if (e instanceof CustomEvent) onChange?.(e.detail?.value);
  });
  return <vatel-pass ref={ref} label={label} placeholder={placeholder} meter={meter || undefined} {...props} />;
}

// Champ texte/e-mail maison : même look .fld input + coche qui « pop »
// quand la valeur devient valide (icône alerte si invalide non vide).
export function Field({ type = 'text', validate, onChange, ...props }) {
  const check = (v) => {
    if (!v) return null;
    if (validate) return validate(v);
    if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return v.trim().length >= 2;
  };
  const [ok, setOk] = useState(() => check(props.defaultValue ?? ''));
  return (
    <div className="vfield">
      <input
        type={type}
        onChange={(e) => { setOk(check(e.target.value)); onChange?.(e); }}
        {...props}
      />
      {ok !== null && (
        <span key={String(ok)} className={`fstat ${ok ? 'ok' : 'bad'}`} aria-hidden="true">
          <Icon name={ok ? 'check' : 'alert'} size={ok ? 20 : 18} sw={2.6} />
        </span>
      )}
    </div>
  );
}

// Bouton d'action : reprend le look .primary (pleine largeur, marine,
// ombre interne) mais raconte l'état comme action-button de la lib —
// le libellé roule lettre par lettre, un spinner tourne pendant l'action,
// puis la coche pop en vert avant onDone().
// onDone peut être async : le bouton reste « en cours » jusqu'à la fin,
// passe en « réussi » seulement si l'action n'échoue pas (exception ou false),
// sinon il redevient cliquable.
export function AppButton({ label, busyLabel = 'Chargement…', doneLabel = 'Terminé', onDone, className = 'primary', disabled, busyMs = 400 }) {
  const [state, setState] = useState('idle');
  const click = async () => {
    if (state !== 'idle') return;
    setState('busy');
    let ok = true;
    try {
      const [res] = await Promise.all([onDone?.(), new Promise((r) => setTimeout(r, busyMs))]);
      ok = res !== false;
    } catch {
      ok = false;
    }
    if (!ok) { setState('idle'); return; }
    setState('done');
    setTimeout(() => setState('idle'), 1800);
  };
  const text = state === 'busy' ? busyLabel : state === 'done' ? doneLabel : label;
  return (
    <button type="button" className={`vbtn ${className} ${state}`} disabled={disabled || state !== 'idle'} onClick={click}>
      {state === 'busy' && <span className="vspin" aria-hidden="true" />}
      {state === 'done' && <span className="vcheck" aria-hidden="true"><Icon name="check" size={20} sw={2.8} /></span>}
      <RollText text={text} />
    </button>
  );
}

// Bouton « maintenir pour confirmer » : look .primary, se remplit pendant
// le maintien du doigt ; relâcher avant la fin annule avec retour élastique.
// Supporte aussi le clavier (Espace/Entrée maintenus).
export function HoldButton({ label, doneLabel = 'Confirmé !', holdMs = 900, onConfirm, className = 'primary' }) {
  const [prog, setProg] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(null);
  const start = () => {
    if (done) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / holdMs);
      setProg(p);
      if (p < 1) { raf.current = requestAnimationFrame(step); return; }
      setDone(true);
      setTimeout(() => onConfirm?.(), 600);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
  };
  const stop = () => { if (!done) { cancelAnimationFrame(raf.current); setProg(0); } };
  return (
    <button
      type="button"
      className={`vhold ${className}${done ? ' done' : ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(); }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') stop(); }}
      onContextMenu={(e) => e.preventDefault()}
      disabled={done}
    >
      <span className="hfill" style={{ transform: `scaleX(${prog})` }} aria-hidden="true" />
      {done && <span className="vcheck" aria-hidden="true"><Icon name="check" size={20} sw={2.8} /></span>}
      <RollText text={done ? doneLabel : label} />
    </button>
  );
}

// Ligne allergène : toggle marine ; quand activée, la ligne grandit et
// révèle les options utiles (sévérité + rappel de blocage réservation).
const SEVERITIES = ['Allergie sévère', 'Allergie', 'Intolérance'];
export function AllergyRow({ name, checked, onChange }) {
  const [sev, setSev] = useState('Allergie');
  return (
    <div className={`arow${checked ? ' on' : ''}`}>
      <div className="arow-head">
        <span className="flex-1 text-[16px] font-bold">{name}</span>
        <Toggle checked={checked} onChange={() => onChange(!checked)} label={name} />
      </div>
      <div className="arow-body" aria-hidden={!checked}>
        <div>
          <div className="flex flex-wrap gap-2 pt-3.5" role="radiogroup" aria-label={`Sévérité · ${name}`}>
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sev === s}
                onClick={() => setSev(s)}
                className={`h-9 px-3.5 rounded-[18px] text-[13px] font-bold cursor-pointer border ${sev === s ? 'bg-marine text-white border-marine' : 'bg-white text-ink border-line'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] leading-[18px] text-muted">
            {sev === 'Allergie sévère'
              ? 'Blocage strict : le plat ne peut pas être réservé.'
              : sev === 'Allergie'
                ? 'Blocage à la réservation si le plat en contient.'
                : 'Avertissement affiché avant la réservation.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Ticket de retrait maison : carte blanche + perforation, la souche se
// détache avec un ressort au toucher (et se rattache au second toucher).
export function TicketCard({ kicker, title, venue, rows = [], admit, code, onTear }) {
  const [torn, setTorn] = useState(false);
  const tear = () => {
    const next = !torn;
    setTorn(next);
    if (next) onTear?.();
  };
  return (
    <div className={`vticket${torn ? ' torn' : ''}`}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted">{kicker}</span>
          <span className="text-[13px] font-bold text-ok">Valide</span>
        </div>
        <b className="block mt-2.5 text-[20px] leading-[25px] font-extrabold tracking-[-0.4px]">{title}</b>
        <span className="block mt-0.5 text-[15px] text-muted">{venue}</span>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {rows.map(([l, v]) => (
            <div key={l}>
              <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-muted">{l}</div>
              <div className="num text-[15px] font-bold mt-1 whitespace-nowrap">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="perf" aria-hidden="true" />
      <button
        type="button"
        className="stub w-full px-5 py-4 text-left flex items-center justify-between bg-transparent border-0 cursor-pointer"
        onClick={tear}
        aria-pressed={torn}
        aria-label={torn ? 'Rattacher la souche' : 'Détacher la souche du ticket'}
      >
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.5px] text-muted">Souche · à remettre au comptoir</span>
          <b className="num text-[16px] font-extrabold">{admit} · {code}</b>
        </span>
        <RollText className="text-[13px] font-bold text-marine" text={torn ? 'Rattacher' : 'Tirer'} />
      </button>
    </div>
  );
}

// Puce « copier » maison : icône qui pop + libellé roulé Copié.
export function CopyChip({ value, label = 'Copier', doneLabel = 'Copié', onCopy }) {
  const [ok, setOk] = useState(false);
  const go = async () => {
    try { await navigator.clipboard.writeText(value); } catch { /* presse-papiers indisponible */ }
    setOk(true);
    onCopy?.();
    setTimeout(() => setOk(false), 1800);
  };
  return (
    <button type="button" className={`vcopy${ok ? ' ok' : ''}`} onClick={go} aria-live="polite">
      <span key={String(ok)} className="fpop"><Icon name={ok ? 'check' : 'copy'} size={16} sw={2.2} /></span>
      <RollText text={ok ? doneLabel : `${label} ${value}`} />
    </button>
  );
}

// Segmented maison : même look .seg (piste #EDEDED, pilule blanche),
// indicateur qui glisse et s'étire avec un ressort à chaque changement.
export function VatelSegmented({ options, value, onChange, className = '', label }) {
  const ref = useRef(null);
  const [rect, setRect] = useState({ left: 4, width: 0 });
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  useEffect(() => {
    const measure = () => {
      const btns = ref.current?.querySelectorAll('button');
      const b = btns?.[idx];
      if (b) setRect({ left: b.offsetLeft, width: b.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [idx, options.length]);
  return (
    <div ref={ref} className={`vseg ${className}`} role="radiogroup" aria-label={label}>
      <span className="ind" style={{ left: rect.left, width: rect.width }} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Simule un chargement réseau pour démontrer les squelettes (données de maquette).
export function useFakeLoading(ms = 650, deps = []) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return loading;
}
