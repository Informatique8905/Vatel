import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../common/Icon';
import VatelLogo from '../common/VatelLogo';
import { useInstallPrompt } from '../common/InstallAppButton';

const ITEMS = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Tableau de bord' },
  { to: '/admin/menus', icon: 'calendar', label: 'Menus' },
  { to: '/admin/creneaux', icon: 'clock', label: 'Créneaux' },
  { to: '/admin/commandes', icon: 'list', label: 'Commandes' },
  { to: '/admin/production', icon: 'pot', label: 'Production' },
  { to: '/admin/scan', icon: 'qr', label: 'Scan des tickets' },
];

export default function AdminSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { visible: canInstall, install } = useInstallPrompt();
  return (
    <nav className="side" aria-label="Administration">
      <div className="brand flex items-center gap-3 px-3.5 pb-7">
        <span className="w-10 h-10 rounded-[20px] bg-white ring-1 ring-line overflow-hidden flex items-center justify-center p-1"><VatelLogo size={32} /></span>
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
      {canInstall && (
        <button
          type="button"
          className="nav mt-auto w-full border-0 bg-transparent cursor-pointer text-left"
          onClick={install}
        >
          <Icon name="plus" />Installer l’application
        </button>
      )}
      <button
        type="button"
        className={`nav w-full border-0 bg-transparent cursor-pointer text-left${canInstall ? '' : ' mt-auto'}`}
        onClick={async () => { await logout(); navigate('/connexion/admin', { replace: true }); }}
      >
        <Icon name="logout" />Se déconnecter
      </button>
    </nav>
  );
}
