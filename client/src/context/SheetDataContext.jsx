import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/client';

const SheetDataContext = createContext(null);

// Sync interval options (minutes). 0 = disabled.
export const SYNC_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: 'Every 5 min', value: 5 },
  { label: 'Every 15 min', value: 15 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Every 1 hour', value: 60 },
  { label: 'Every 6 hours', value: 360 },
];

const STORAGE_KEY = 'sheethub_sync_interval';

export function SheetDataProvider({ children }) {
  const [cache, setCache] = useState({}); // { [sheetId]: { data, fetchedAt } }
  const [syncInterval, setSyncIntervalState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 60; // default 1 hour
  });
  const inflight = useRef({});

  const setSyncInterval = useCallback((minutes) => {
    setSyncIntervalState(minutes);
    localStorage.setItem(STORAGE_KEY, String(minutes));
  }, []);

  const cacheKey = (id, gid) => `${id}::${gid ?? ''}`;

  const getSheetData = useCallback((id, { force = false, gid } = {}) => {
    const key = cacheKey(id, gid);
    if (!force && cache[key]) return Promise.resolve(cache[key].data);
    if (inflight.current[key]) return inflight.current[key];

    const url = `/sheets/${id}/data${gid !== undefined && gid !== null && gid !== '' ? `?gid=${encodeURIComponent(gid)}` : ''}`;
    const p = api.get(url).then((r) => {
      setCache((c) => ({ ...c, [key]: { data: r.data, fetchedAt: Date.now() } }));
      delete inflight.current[key];
      return r.data;
    }).catch((e) => {
      delete inflight.current[key];
      throw e;
    });
    inflight.current[key] = p;
    return p;
  }, [cache]);

  const invalidate = useCallback((id, gid) => {
    setCache((c) => {
      if (!id) return {};
      const next = { ...c };
      if (gid !== undefined) {
        delete next[cacheKey(id, gid)];
      } else {
        // Remove all entries for this sheet id
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${id}::`)) delete next[k];
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!syncInterval) return;
    const tick = () => {
      const now = Date.now();
      const staleMs = syncInterval * 60 * 1000;
      Object.entries(cache).forEach(([key, entry]) => {
        if (now - entry.fetchedAt >= staleMs && !inflight.current[key]) {
          const [id, gid] = key.split('::');
          getSheetData(id, { force: true, gid: gid || undefined }).catch(() => {});
        }
      });
    };
    tick();
    const t = setInterval(tick, 60 * 1000);
    return () => clearInterval(t);
  }, [syncInterval, cache, getSheetData]);

  return (
    <SheetDataContext.Provider value={{ cache, getSheetData, invalidate, syncInterval, setSyncInterval, cacheKey }}>
      {children}
    </SheetDataContext.Provider>
  );
}

export const useSheetData = () => useContext(SheetDataContext);
