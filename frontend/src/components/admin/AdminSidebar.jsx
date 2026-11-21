import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';

const ITEMS = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Tableau de bord' },
  { to: '/admin/menus', icon: 'calendar', label: 'Menus' },
  { to: '/admin/creneaux', icon: 'clock', label: 'Créneaux' },
  { to: '/admin/commandes', icon: 'list', label: 'Commandes' },
  { to: '/admin/production', icon: 'pot', label: 'Production' },
  { to: '/admin/scan', icon: 'qr', label: 'Scan des tickets' },
];

export default function AdminSidebar() {
  return (
    <nav className="side" aria-label="Administration">
      <div className="brand flex items-center gap-3 px-3.5 pb-7">
        <span className="w-10 h-10 rounded-[20px] bg-marine text-white flex items-center justify-center text-[14px] font-extrabold">MC</span>
        <div>
          <b className="text-[16px] font-extrabold">Ma Cantine</b>
          <div className="text-[13px] text-muted">Cantine Vatel</div>
        </div>
      </div>
      {ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav${isActive ? ' on' : ''}`}>
          <Icon name={it.icon} />{it.label}
        </NavLink>
      ))}
    </nav>
  );
}
