import { useEffect, useState } from 'react';
import { KeyRound, Mail, Shield, Calendar, Clock, MapPin, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';
import api from '../api/client';

const roleGradient = {
  admin: 'from-indigo-500 via-purple-500 to-pink-500',
  user: 'from-sky-500 via-blue-500 to-indigo-500',
};

const roleBadge = {
  admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800',
  user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700',
};

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatMonth(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

export default function Profile() {
  const { user } = useAuth();
  const [showChangePw, setShowChangePw] = useState(false);
  const [fresh, setFresh] = useState(user);

  useEffect(() => {
    api.get('/auth/me').then((r) => setFresh(r.data.user)).catch(() => {});
  }, []);

  const u = fresh || user;
  const gradient = roleGradient[u?.role] || roleGradient.user;
  const badge = roleBadge[u?.role] || roleBadge.user;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Hero card */}
      <div className={`relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.4),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xl sm:text-2xl font-bold flex items-center justify-center ring-2 ring-white/40 shrink-0">
              {initials(u?.name)}
            </div>
            <div className="text-white min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-bold truncate">{u?.name}</h2>
                <CheckCircle2 size={16} className="text-emerald-300 shrink-0" title="Active" />
              </div>
              <div className="text-xs text-white/80 truncate">{u?.email}</div>
              <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/30">
                <Shield size={10} /> {u?.role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowChangePw(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-white text-indigo-700 font-medium rounded-lg text-sm shadow-md"
          >
            <KeyRound size={13} /> Change Password
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Calendar size={16} />} label="Member Since" value={formatMonth(u?.createdAt)} tone="indigo" />
        <StatCard icon={<Clock size={16} />} label="Last Login" value={formatDate(u?.lastLoginAt)} tone="emerald" />
        <StatCard icon={<MapPin size={16} />} label="Last Login IP" value={u?.lastLoginIp || '—'} tone="amber" />
      </div>

      {/* Account details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Account Details</h3>
        </div>
        <dl className="divide-y divide-slate-200 dark:divide-slate-800">
          <Row icon={<UserIcon size={14} />} label="Full Name" value={u?.name} />
          <Row icon={<Mail size={14} />} label="Email" value={u?.email} />
          <Row icon={<Shield size={14} />} label="Role" value={<span className="capitalize">{u?.role}</span>} />
          <Row
            icon={<CheckCircle2 size={14} />}
            label="Status"
            value={
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
              </span>
            }
          />
          <Row icon={<Calendar size={14} />} label="Created" value={formatDate(u?.createdAt)} />
          <Row icon={<Clock size={14} />} label="Updated" value={formatDate(u?.updatedAt)} />
        </dl>
      </div>

      {/* Security tip */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-200 dark:border-indigo-900 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center">
          <Shield size={16} />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Keep your account secure</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Use a strong password (8+ chars, mixed case, numbers, symbols) and change it regularly.
          </p>
          <button
            onClick={() => setShowChangePw(true)}
            className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Update password now →
          </button>
        </div>
      </div>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}

function StatCard({ icon, label, value, tone = 'indigo' }) {
  const toneMap = {
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:shadow-md transition">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <dt className="text-xs text-slate-500 dark:text-slate-400 w-32 shrink-0">{label}</dt>
      <dd className="text-xs font-medium text-slate-800 dark:text-slate-100 flex-1 min-w-0 truncate">{value}</dd>
    </div>
  );
}
