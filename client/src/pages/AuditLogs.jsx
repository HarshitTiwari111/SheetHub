import { useEffect, useState } from 'react';
import { ScrollText, Filter, RefreshCw } from 'lucide-react';
import api from '../api/client';

const ACTION_COLORS = {
  'auth.login': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'auth.logout': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'auth.change_password': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'user.create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'user.update': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'user.delete': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'sheet.create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'sheet.update': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'sheet.delete': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
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

  useEffect(() => { load(); }, [action, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScrollText size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Audit Logs</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm outline-none"
          >
            <option value="">All actions</option>
            <option value="auth.login">Login</option>
            <option value="auth.logout">Logout</option>
            <option value="auth.change_password">Password Change</option>
            <option value="user.create">User Create</option>
            <option value="user.update">User Update</option>
            <option value="user.delete">User Delete</option>
            <option value="sheet.create">Sheet Create</option>
            <option value="sheet.update">Sheet Update</option>
            <option value="sheet.delete">Sheet Delete</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm outline-none"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">When</th>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Actor</th>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Action</th>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Resource</th>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">IP</th>
                <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No logs found</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatTime(l.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                      <div className="font-medium">{l.actor?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{l.actorEmail}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${ACTION_COLORS[l.action] || 'bg-slate-100 dark:bg-slate-800'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {l.resourceType ? `${l.resourceType}` : '—'}
                      {l.resourceId && <span className="text-xs text-slate-400 block">#{String(l.resourceId).slice(-6)}</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs">{l.ip || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${l.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
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
