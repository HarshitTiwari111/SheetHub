import { useEffect, useRef, useState } from 'react';
import { Eye, ChevronDown, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useImpersonation } from '../context/ImpersonationContext.jsx';
import api from '../api/client';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U';
}

export default function ViewAsDropdown() {
  const { user } = useAuth();
  const { isImpersonating, startImpersonation, stopImpersonation } = useImpersonation();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/users').then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }, [open]);

  if (user?.role !== 'admin') return null;

  const filtered = users.filter(
    (u) => u._id !== user._id &&
      (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );

  const pick = (u) => {
    startImpersonation(u);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="relative" ref={ref}>
      {isImpersonating ? (
        <button
          onClick={stopImpersonation}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition text-xs sm:text-sm font-medium"
          title="Exit view-as mode"
        >
          <X size={14} />
          <span className="hidden sm:inline">Exit View-As</span>
          <span className="sm:hidden">Exit</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Eye size={14} /> View As
          <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && !isImpersonating && (
        <div className="absolute right-0 mt-2 w-[90vw] sm:w-72 max-w-[288px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-40 animate-[fadeIn_0.12s_ease-out] overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search user..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No users found</div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u._id}
                  onClick={() => pick(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    {u.role}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
