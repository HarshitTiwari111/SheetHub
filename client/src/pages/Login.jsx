import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LayoutGrid, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // 2FA state
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submitLogin = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await login(email, password);
      if (res?.twoFactorRequired) {
        setTwoFactorStep(true);
        setTempToken(res.tempToken);
      } else {
        navigate('/');
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const submit2FA = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await verify2FA(tempToken, twoFactorCode);
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.message || '2FA Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
        {/* Left dark panel */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 flex flex-col items-center justify-center overflow-hidden min-h-[320px]">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full border border-white/5"></div>
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full border border-white/5"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-5">
              <LayoutGrid className="text-indigo-300" size={28} />
            </div>
            <h1 className="text-2xl font-bold leading-tight">SheetHub Enterprise</h1>
            <p className="mt-3 text-slate-300 text-sm max-w-xs">
              All your Google Sheets,<br />secured with enterprise-grade protection
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-8 h-px bg-slate-600"></div>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> Encrypted & Audited
              </span>
              <div className="w-8 h-px bg-slate-600"></div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="max-w-xs w-full mx-auto">
            {twoFactorStep ? (
              <div>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                    <KeyRound size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Two-Factor Authentication</h2>
                  <p className="text-slate-500 text-xs mt-1.5">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                {err && (
                  <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {err}
                  </div>
                )}

                <form onSubmit={submit2FA} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                      className="w-full bg-indigo-50/60 border border-indigo-200 focus:border-indigo-500 focus:bg-white outline-none rounded-lg px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-800 transition"
                      placeholder="123456"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || twoFactorCode.length !== 6}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition shadow-lg shadow-indigo-600/20"
                  >
                    {busy ? 'Verifying...' : 'Verify 2FA Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTwoFactorStep(false)}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 text-center py-1"
                  >
                    ← Back to login
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Sign in</h2>
                  <p className="text-slate-500 text-xs mt-1.5">Enter your credentials to access your dashboard</p>
                </div>

                {err && (
                  <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {err}
                  </div>
                )}

                <form onSubmit={submitLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-indigo-50/60 border border-transparent focus:border-indigo-400 focus:bg-white outline-none rounded-lg px-3 py-2 text-sm text-slate-800 transition"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-indigo-50/60 border border-transparent focus:border-indigo-400 focus:bg-white outline-none rounded-lg px-3 py-2 pr-10 text-sm text-slate-800 transition"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-3.5 h-3.5 accent-indigo-600 rounded"
                    />
                    Remember me
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition shadow-lg shadow-indigo-600/20"
                  >
                    {busy ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
