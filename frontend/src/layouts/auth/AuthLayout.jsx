import { Outlet } from 'react-router-dom';
import MobileShell from '../../components/common/MobileShell';

export default function AuthLayout() {
  return (
    <MobileShell>
      <Outlet />
    </MobileShell>
  );
}
