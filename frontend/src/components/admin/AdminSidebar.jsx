import { NavLink, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Tableau de bord' },
  { to: '/admin/menus', icon: 'calendar', label: 'Menus' },
  { to: '/admin/commandes', icon: 'list', label: 'Commandes' },
  { to: '/admin/production', icon: 'pot', label: 'Production' },
  { to: '/admin/scan', icon: 'qr', label: 'Scan des tickets' },
];

const initials = (u) =>
  `${u?.firstName?.[0] ?? 'A'}${u?.lastName?.[0] ?? ''}`.toUpperCase();

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

      <div className="mt-auto flex items-center gap-3 px-3.5 pt-4 border-t border-line">
        <span className="w-10 h-10 rounded-[20px] bg-tint text-marine flex items-center justify-center text-[14px] font-extrabold flex-none">
          {initials(user)}
        </span>
        <div className="flex-1 min-w-0">
          <b className="block text-[14px] font-bold truncate">{user ? `${user.firstName} ${user.lastName}` : '…'}</b>
          <span className="block text-[13px] text-muted truncate">{user?.email ?? ''}</span>
        </div>
        <button
          type="button"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="w-10 h-10 flex items-center justify-center text-danger bg-transparent border-0 cursor-pointer flex-none"
          onClick={async () => { await logout(); navigate('/connexion', { replace: true }); }}
        >
          <Icon name="logout" />
        </button>
      </div>
    </nav>
  );
}
