import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileShell from '../../components/common/MobileShell';
import LiquidTabBar from '../../components/common/LiquidTabBar';
import { PageLoader } from '../../components/common/Loader';

const TABS = [
  { to: '/student', end: true, icon: 'home', label: 'Accueil', activeFill: true },
  { to: '/student/menu', icon: 'calendar', label: 'Menu' },
  { to: '/student/ticket', icon: 'qr', label: 'Ticket' },
  { to: '/student/solde', icon: 'wallet', label: 'Solde' },
  { to: '/student/profil', icon: 'user', label: 'Profil' },
];

// Écrans plein écran sans barre d'onglets (maquettes eleve-04 et eleve-05).
const NO_TABBAR = ['/student/plat', '/student/creneau'];

export default function StudentLayout() {
  const { pathname } = useLocation();
  return (
    <MobileShell tabBar={NO_TABBAR.includes(pathname) ? null : <LiquidTabBar items={TABS} />}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </MobileShell>
  );
}
