import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

let accessToken = localStorage.getItem('sheethub_token') || null;

export const setAccessToken = (t) => {
  accessToken = t;
  if (t) localStorage.setItem('sheethub_token', t);
  else localStorage.removeItem('sheethub_token');
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
            .then((r) => {
              setAccessToken(r.data.token);
              return r.data.token;
            })
            .finally(() => { refreshing = null; });
        }
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        if (!location.pathname.startsWith('/login')) location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
