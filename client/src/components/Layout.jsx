import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, ChevronDown, Sun, Moon, Eye, X, KeyRound, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useImpersonation } from '../context/ImpersonationContext.jsx';
import Sidebar from './Sidebar.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import ViewAsDropdown from './ViewAsDropdown.jsx';
import api from '../api/client';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
}

export default function Layout() {
  const { user: realUser, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { effectiveUser, isImpersonating, stopImpersonation } = useImpersonation();
  const user = effectiveUser;
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLogout, setShowLogout] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const menuRef = useRef(null);

  const loadSheets = () => api.get('/sheets').then((r) => setSheets(r.data));

  useEffect(() => { loadSheets(); }, [refreshKey]);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doLogout = () => {
    logout();
    setShowLogout(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar
        sheets={sheets}
        onSheetsChange={() => setRefreshKey((k) => k + 1)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              title="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">SheetHub</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
          <ViewAsDropdown />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center">
                {initials(user?.name)}
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</div>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-40 animate-[fadeIn_0.12s_ease-out]">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <UserIcon size={16} className="text-slate-500 dark:text-slate-400" />
                  Profile
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); setShowChangePw(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <KeyRound size={16} className="text-slate-500 dark:text-slate-400" />
                  Change Password
                </button>
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? (
                    <Sun size={16} className="text-amber-500" />
                  ) : (
                    <Moon size={16} className="text-slate-500 dark:text-slate-400" />
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                <button
                  onClick={() => { setMenuOpen(false); setShowLogout(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 overflow-auto">
          <Outlet context={{ sheets, reloadSheets: () => setRefreshKey((k) => k + 1) }} />
        </main>
      </div>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      <ConfirmModal
        open={showLogout}
        title="Logout?"
        message="Are you sure you want to logout from SheetHub?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        tone="red"
        icon={<LogOut size={22} />}
        onConfirm={doLogout}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  );
}
