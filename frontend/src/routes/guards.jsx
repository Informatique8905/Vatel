import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Loader';

// Garde de rôle : la protection frontend est un confort UX — chaque
// route API reste vérifiée côté backend (AGENTS.md).
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <PageLoader fill="100dvh" />;
  if (!user) {
    const to = roles.includes('ADMIN') ? '/connexion/admin' : roles.includes('PARENT') ? '/connexion/parent' : '/connexion';
    return <Navigate to={to} replace state={{ from: pathname + search }} />;
  }
  if (!roles.includes(user.role)) {
    const home = { STUDENT: '/student', PARENT: '/parent', ADMIN: '/admin' }[user.role];
    return <Navigate to={home ?? '/connexion'} replace />;
  }
  return <Outlet />;
}

// Zone publique : un utilisateur déjà connecté est redirigé vers son espace.
// Après connexion, retour à la page demandée (ex. lien d'invitation) si
// elle appartient à l'espace du rôle.
export function GuestOnly() {
  const { user, loading } = useAuth();
  const from = useLocation().state?.from;
  if (loading) return <PageLoader fill="100dvh" />;
  if (user) {
    const home = { STUDENT: '/student', PARENT: '/parent', ADMIN: '/admin' }[user.role];
    const to = home && from?.startsWith(home) ? from : home;
    return <Navigate to={to ?? '/connexion'} replace />;
  }
  return <Outlet />;
}
