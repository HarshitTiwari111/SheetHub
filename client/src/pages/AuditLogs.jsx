import { useEffect, useState } from 'react';
import { ScrollText, Filter, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../api/client';

const ACTION_COLORS = {
  'auth.login': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'auth.login.new_device': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  'auth.login.2fa_success': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'auth.2fa.enabled': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'auth.2fa.disabled': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'auth.logout': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'auth.change_password': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'user.create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'user.update': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'user.delete': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'sheet.create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'sheet.update': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'sheet.delete': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'upload.file': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (action) q.set('action', action);
    if (status) q.set('status', status);
    api
      .get(`/audit?${q.toString()}`)
      .then((r) => setLogs(r.data.logs))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [action, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScrollText size={22} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Security Audit Logs</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm outline-none shadow-sm"
          >
            <option value="">All Security Actions</option>
            <option value="auth.login">Login</option>
            <option value="auth.login.new_device">⚠️ New Device Login</option>
            <option value="auth.2fa.enabled">2FA Enabled</option>
            <option value="auth.2fa.disabled">2FA Disabled</option>
            <option value="auth.logout">Logout</option>
            <option value="auth.change_password">Password Change</option>
            <option value="user.create">User Create</option>
            <option value="user.update">User Update</option>
            <option value="user.delete">User Delete</option>
            <option value="sheet.create">Sheet Create</option>
            <option value="sheet.update">Sheet Update</option>
            <option value="sheet.delete">Sheet Delete</option>
            <option value="upload.file">File Upload</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm outline-none shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Timestamp</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Actor / User</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Action Event</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Resource</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">IP Address</th>
                <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No audit records found
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs font-mono whitespace-nowrap">
                      {formatTime(l.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="font-semibold text-xs">{l.actor?.name || 'System / Guest'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{l.actorEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 font-medium rounded-full ${ACTION_COLORS[l.action] || 'bg-slate-100 dark:bg-slate-800'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      {l.resourceType ? `${l.resourceType}` : '—'}
                      {l.resourceId && <span className="text-[10px] text-slate-400 block font-mono">#{String(l.resourceId).slice(-6)}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono">{l.ip || '127.0.0.1'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-0.5 font-semibold rounded-full ${
                          l.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
