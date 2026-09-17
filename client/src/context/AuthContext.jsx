import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken } from '../api/client';

const AuthContext = createContext(null);

export const ROLES = ['admin', 'user'];
export const ROLE_RANK = { admin: 2, user: 1 };
export const ROLE_LABEL = {
  admin: 'Admin',
  user: 'User',
};
export const canManage = (actorRole, targetRole) =>
  (ROLE_RANK[actorRole] || 0) >= (ROLE_RANK[targetRole] || 0);
export const isAdminLevel = (role) => role === 'admin';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = async () => {
    try {
      if (getAccessToken()) {
        const r = await api.get('/auth/me');
        setUser(r.data.user);
      } else {
        // Try silent refresh (in case cookie exists)
        try {
          const r = await api.post('/auth/refresh');
          setAccessToken(r.data.token);
          setUser(r.data.user);
        } catch { /* not logged in */ }
      }
    } catch {
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { bootstrap(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
