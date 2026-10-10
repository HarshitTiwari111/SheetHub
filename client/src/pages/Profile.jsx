import { useEffect, useState } from 'react';
import {
  KeyRound,
  Mail,
  Shield,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  User as UserIcon,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, ROLE_LABEL } from '../context/AuthContext.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';
import api from '../api/client';

const roleGradient = {
  superadmin: 'from-purple-600 via-indigo-600 to-pink-600',
  admin: 'from-indigo-600 via-purple-600 to-pink-600',
  manager: 'from-amber-500 via-orange-600 to-indigo-600',
  employee: 'from-sky-600 via-blue-600 to-indigo-600',
};

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
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

  // 2FA states
  const [twoFactorModal, setTwoFactorModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorErr, setTwoFactorErr] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const loadUser = () => {
    api
      .get('/auth/me')
      .then((r) => setFresh(r.data.user))
      .catch(() => {});
  };

  useEffect(() => {
    loadUser();
  }, []);

  const u = fresh || user;
  const gradient = roleGradient[u?.role] || roleGradient.employee;

  const start2FA = async () => {
    setTwoFactorErr('');
    setTwoFactorSuccess('');
    setTwoFactorBusy(true);
    try {
      const res = await api.post('/auth/2fa/generate');
      setQrCodeData(res.data);
      setTwoFactorModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate 2FA secret');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmEnable2FA = async (e) => {
    e.preventDefault();
    setTwoFactorErr('');
    setTwoFactorBusy(true);
    try {
      await api.post('/auth/2fa/enable', {
        secret: qrCodeData.secret,
        twoFactorCode,
      });
      setTwoFactorSuccess('2FA successfully enabled!');
      setTwoFactorModal(false);
      setTwoFactorCode('');
      loadUser();
    } catch (err) {
      setTwoFactorErr(err.response?.data?.message || '2FA activation failed');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disable2FA = async () => {
    const password = prompt('Enter your current password to disable 2FA:');
    if (!password) return;
    try {
      await api.post('/auth/2fa/disable', { password });

      alert('2FA has been disabled.');
      loadUser();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Hero card */}
      <div className={`relative rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.4),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-3 p-5 sm:p-6 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white text-xl sm:text-2xl font-bold flex items-center justify-center ring-2 ring-white/40 shrink-0 shadow-inner">
              {initials(u?.name)}
            </div>
            <div className="text-white min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold truncate">{u?.name}</h2>
                <CheckCircle2 size={18} className="text-emerald-300 shrink-0" title="Active" />
              </div>
              <div className="text-xs sm:text-sm text-white/90 truncate">{u?.email}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
                  <Shield size={12} /> {ROLE_LABEL[u?.role] || u?.role}
                </span>
                {u?.twoFactorEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-300/40 backdrop-blur-sm">
                    <ShieldCheck size={12} /> 2FA Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/20 text-white/80 ring-1 ring-white/20">
                    2FA Disabled
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowChangePw(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-indigo-700 font-semibold rounded-xl text-sm shadow transition"
          >
            <KeyRound size={15} /> Change Password
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Calendar size={16} />} label="Member Since" value={formatMonth(u?.createdAt)} tone="indigo" />
        <StatCard icon={<Clock size={16} />} label="Last Login" value={formatDate(u?.lastLoginAt)} tone="emerald" />
        <StatCard icon={<MapPin size={16} />} label="Last Login IP" value={u?.lastLoginIp || '—'} tone="amber" />
      </div>

      {/* 2FA Security Management Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Two-Factor Authentication (2FA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protect your account with Google Authenticator or Authy TOTP codes
              </p>
            </div>
          </div>
          {u?.twoFactorEnabled ? (
            <button
              onClick={disable2FA}
              className="px-3.5 py-1.5 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-semibold transition"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={start2FA}
              disabled={twoFactorBusy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              {twoFactorBusy ? 'Generating...' : 'Setup 2FA Now'}
            </button>
          )}
        </div>

        {twoFactorSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
            <ShieldCheck size={16} /> {twoFactorSuccess}
          </div>
        )}
      </div>

      {/* Account details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Account & Security Profile</h3>
        </div>
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row icon={<UserIcon size={14} />} label="Full Name" value={u?.name} />
          <Row icon={<Mail size={14} />} label="Email" value={u?.email} />
          <Row icon={<Shield size={14} />} label="Security Privilege" value={ROLE_LABEL[u?.role] || u?.role} />
          <Row
            icon={<CheckCircle2 size={14} />}
            label="Account Status"
            value={
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
              </span>
            }
          />
          <Row icon={<Calendar size={14} />} label="Created" value={formatDate(u?.createdAt)} />
          <Row icon={<Clock size={14} />} label="Last Password Change" value={formatDate(u?.updatedAt)} />
        </dl>
      </div>

      {/* 2FA Modal */}
      {twoFactorModal && qrCodeData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-2">
                <QrCode size={26} />
              </div>
              <h3 className="text-lg font-bold">Set up Two-Factor Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scan this QR code with Google Authenticator or Authy
              </p>
            </div>

            {twoFactorErr && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                {twoFactorErr}
              </div>
            )}

            <div className="flex justify-center bg-white p-3 rounded-xl border border-slate-200 w-fit mx-auto shadow-inner">
              <img src={qrCodeData.qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Secret Key</span>
              <code className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 select-all">
                {qrCodeData.secret}
              </code>
            </div>

            <form onSubmit={confirmEnable2FA} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter 6-digit Code from Authenticator App:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="123456"
                  className="w-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-center text-lg font-mono tracking-widest outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTwoFactorModal(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={twoFactorBusy || twoFactorCode.length !== 6}
                  className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 transition shadow"
                >
                  {twoFactorBusy ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <dt className="text-xs text-slate-500 dark:text-slate-400 w-36 shrink-0">{label}</dt>
      <dd className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex-1 min-w-0 truncate">{value}</dd>
    </div>
  );
}
