import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="admin">
      <div className="wrap">
        <AdminSidebar />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
