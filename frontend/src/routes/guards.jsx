import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Loader';

// Garde de rôle : la protection frontend est un confort UX — chaque
// route API reste vérifiée côté backend (AGENTS.md).
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <PageLoader fill="100dvh" />;
  if (!user) {
    return <Navigate to={roles.includes('ADMIN') ? '/connexion/admin' : '/connexion'} replace />;
  }
  if (!roles.includes(user.role)) {
    const home = { STUDENT: '/student', PARENT: '/parent', ADMIN: '/admin' }[user.role];
    return <Navigate to={home ?? '/connexion'} replace />;
  }
  return <Outlet />;
}

// Zone publique : un utilisateur déjà connecté est redirigé vers son espace.
export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader fill="100dvh" />;
  if (user) {
    const home = { STUDENT: '/student', PARENT: '/parent', ADMIN: '/admin' }[user.role];
    return <Navigate to={home ?? '/connexion'} replace />;
  }
  return <Outlet />;
}
