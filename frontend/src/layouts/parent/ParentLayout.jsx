import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import MobileShell from '../../components/common/MobileShell';
import LiquidTabBar from '../../components/common/LiquidTabBar';
import { PageLoader } from '../../components/common/Loader';

const TABS = [
  { to: '/parent', end: true, icon: 'family', label: 'Enfants' },
  { to: '/parent/recharge', icon: 'plus', label: 'Recharger' },
  { to: '/parent/repas', icon: 'bowl', label: 'Repas' },
  { to: '/parent/compte', icon: 'user', label: 'Compte' },
];

export default function ParentLayout() {
  return (
    <MobileShell tabBar={<LiquidTabBar items={TABS} />}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </MobileShell>
  );
}
