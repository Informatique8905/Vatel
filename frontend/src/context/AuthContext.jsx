import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../services/api';

// Session utilisateur : chargée une fois au démarrage via /auth/me
// (cookie de session), puis gardée en mémoire. Les guards de rôle
// s'appuient sur user.role — l'API revérifie tout côté serveur.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api('/auth/me')
      .then(({ user }) => { if (alive) setUser(user); })
      .catch(() => { if (alive) setUser(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (body) => {
    const { user } = await api('/auth/register', { method: 'POST', body });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', body: {} }); }
    catch { /* la session est peut-être déjà expirée */ }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api('/auth/me');
      setUser(user);
      return user;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
};

export { ApiError };
