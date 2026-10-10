import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken } from '../api/client';

const AuthContext = createContext(null);

export const ROLES = ['superadmin', 'admin', 'manager', 'employee'];
export const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  employee: 1,
  user: 1,
};

export const ROLE_LABEL = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  user: 'Employee',
};

export const canManage = (actorRole, targetRole) =>
  (ROLE_RANK[actorRole] || 0) >= (ROLE_RANK[targetRole] || 0);

export const isAdminLevel = (role) => ['superadmin', 'admin'].includes(role);
export const isManagerLevel = (role) => ['superadmin', 'admin', 'manager'].includes(role);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = async () => {
    try {
      if (getAccessToken()) {
        const r = await api.get('/auth/me');
        setUser(r.data.user);
      } else {
        // Silent refresh in case HttpOnly refresh token cookie exists
        try {
          const r = await api.post('/auth/refresh');
          setAccessToken(r.data.token);
          setUser(r.data.user);
        } catch {
          /* not logged in */
        }
      }
    } catch {
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.twoFactorRequired) {
      return { twoFactorRequired: true, tempToken: data.tempToken };
    }
    setAccessToken(data.token);
    setUser(data.user);
    return { user: data.user, newDeviceAlert: data.newDeviceAlert };
  };

  const verify2FA = async (tempToken, twoFactorCode) => {
    const { data } = await api.post('/auth/2fa/verify-login', { tempToken, twoFactorCode });
    setAccessToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, verify2FA, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
