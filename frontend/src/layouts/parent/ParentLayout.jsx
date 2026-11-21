import { Outlet } from 'react-router-dom';
import MobileShell from '../../components/common/MobileShell';
import TabBar from '../../components/common/TabBar';

const TABS = [
  { to: '/parent', end: true, icon: 'family', label: 'Enfants' },
  { to: '/parent/recharge', icon: 'plus', label: 'Recharger' },
  { to: '/parent/repas', icon: 'bowl', label: 'Repas' },
  { icon: 'user', label: 'Compte' },
];

export default function ParentLayout() {
  return (
    <MobileShell tabBar={<TabBar items={TABS} />}>
      <Outlet />
    </MobileShell>
  );
}
