import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';

// Menu « ⋯ » ancré à sa ligne : le popover-menu KBR positionne sa carte
// hors du flux (elle se détachait des lignes dans la liste des menus).
// Fermeture au clic extérieur et à Échap.
export default function RowMenu({ label = 'Actions', items = [], onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex flex-none">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-9 h-9 rounded-full bg-soft text-muted hover:bg-line flex items-center justify-center cursor-pointer"
      >
        <Icon name="dots" size={18} />
      </button>
      {open && (
        <span role="menu" className="absolute right-0 top-10 z-30 min-w-44 overflow-hidden rounded-[12px] border border-line bg-white py-1 shadow-[0_10px_30px_rgba(7,42,93,.18)]">
          {items.map((it) => (
            <button
              key={it}
              type="button"
              role="menuitem"
              className="flex w-full px-4 py-2.5 text-left text-[15px] font-semibold text-ink hover:bg-soft cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onSelect?.(it); }}
            >
              {it}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
