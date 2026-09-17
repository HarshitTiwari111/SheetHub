import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, Users as UsersIcon, LayoutGrid, Menu, ScrollText, User as UserIcon, X } from 'lucide-react';
import { useImpersonation } from '../context/ImpersonationContext.jsx';
import { isAdminLevel } from '../context/AuthContext.jsx';
import AddSheetModal from './AddSheetModal.jsx';

export default function Sidebar({ sheets, onSheetsChange, mobileOpen, onMobileClose }) {
  const { effectiveUser } = useImpersonation();
  const isAdmin = isAdminLevel(effectiveUser?.role);
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sheethub_sidebar_collapsed') === '1'
  );

  useEffect(() => {
    localStorage.setItem('sheethub_sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // On mobile, always show full width when open
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectiveCollapsed = mobileOpen ? false : collapsed;

  const linkCls = ({ isActive }) =>
    `group relative flex items-center ${effectiveCollapsed ? 'md:justify-center' : ''} gap-2 px-3 py-2 rounded-md text-sm ${
      isActive ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-700'
    }`;

  const Tip = ({ children }) =>
    effectiveCollapsed ? (
      <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-slate-950 text-white text-xs px-2 py-1 opacity-0 md:group-hover:opacity-100 transition shadow-lg hidden md:inline-block">
        {children}
      </span>
    ) : null;

  const handleLinkClick = () => {
    if (mobileOpen) onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`${collapsed ? 'md:w-16' : 'md:w-64'} w-64 transition-[width,transform] duration-200 bg-slate-800 dark:bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800 dark:border-slate-800 fixed md:sticky top-0 left-0 z-50 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className={`h-16 border-b border-slate-700 dark:border-slate-800 shrink-0 flex items-center ${effectiveCollapsed ? 'md:justify-center md:px-2' : 'px-3 gap-2.5'}`}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-900/40 hover:from-indigo-600 hover:to-indigo-800 transition hidden md:flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={22} className="text-white" /> : <LayoutGrid size={22} className="text-white" />}
          </button>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-900/40 md:hidden">
            <LayoutGrid size={22} className="text-white" />
          </div>
          {!effectiveCollapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-base font-bold truncate">SheetHub</div>
              <div className="text-[11px] text-slate-400 truncate">All sheets, one place</div>
            </div>
          )}
          {!effectiveCollapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-700 hidden md:inline-flex"
              title="Collapse sidebar"
            >
              <Menu size={20} />
            </button>
          )}
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-700 md:hidden ml-auto"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
          <NavLink to="/" end className={linkCls} onClick={handleLinkClick}>
            <LayoutDashboard size={16} className="shrink-0" />
            {!effectiveCollapsed && <span>Dashboard</span>}
            <Tip>Dashboard</Tip>
          </NavLink>

          <div className="mt-2"></div>
          {sheets.length === 0 && !effectiveCollapsed && (
            <div className="px-3 py-2 text-xs text-slate-500">No sheets yet</div>
          )}
          {sheets.map((s) => (
            <NavLink key={s._id} to={`/sheet/${s._id}`} className={linkCls} onClick={handleLinkClick}>
              <FileText size={16} className="shrink-0" />
              {!effectiveCollapsed && <span className="truncate">{s.name}</span>}
              <Tip>{s.name}</Tip>
            </NavLink>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            className={`group relative w-full mt-2 flex items-center ${effectiveCollapsed ? 'md:justify-center' : ''} gap-2 px-3 py-2 rounded-md text-sm bg-emerald-600 hover:bg-emerald-700`}
            title={effectiveCollapsed ? 'Add Page' : ''}
          >
            <Plus size={16} className="shrink-0" />
            {!effectiveCollapsed && <span>Add Page</span>}
            <Tip>Add Page</Tip>
          </button>

          {isAdmin && (
            <div className="mt-2 space-y-1">
              <NavLink to="/users" className={linkCls} onClick={handleLinkClick}>
                <UsersIcon size={16} className="shrink-0" />
                {!effectiveCollapsed && <span>Users</span>}
                <Tip>Users</Tip>
              </NavLink>
              <NavLink to="/audit" className={linkCls} onClick={handleLinkClick}>
                <ScrollText size={16} className="shrink-0" />
                {!effectiveCollapsed && <span>Audit Logs</span>}
                <Tip>Audit Logs</Tip>
              </NavLink>
            </div>
          )}

          <div className="mt-2">
            <NavLink to="/profile" className={linkCls} onClick={handleLinkClick}>
              <UserIcon size={16} className="shrink-0" />
              {!effectiveCollapsed && <span>Profile</span>}
              <Tip>Profile</Tip>
            </NavLink>
          </div>
        </nav>

        {showAdd && (
          <AddSheetModal
            onClose={() => setShowAdd(false)}
            onSaved={() => { setShowAdd(false); onSheetsChange(); }}
          />
        )}
      </aside>
    </>
  );
}
