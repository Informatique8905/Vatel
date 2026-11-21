import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { PageLoader } from '../../components/common/Loader';

export default function AdminLayout() {
  return (
    <div className="admin">
      <div className="wrap">
        <AdminSidebar />
        <main className="main">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
