import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import MobileShell from '../../components/common/MobileShell';
import { PageLoader } from '../../components/common/Loader';

export default function AuthLayout() {
  return (
    <MobileShell>
      <Suspense fallback={<PageLoader fill="80dvh" />}>
        <Outlet />
      </Suspense>
    </MobileShell>
  );
}
