/**
 * CardioEvidence — Professional Login Page
 * Multidisciplinary Clinical Evidence Timeline Platform.
 * 6 role accounts: Cardiologist, Pathologist, Imaging Specialist,
 *                  Molecular Specialist, Reviewer, Administrator.
 */

import React, { useState } from 'react';
import {
  Activity,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Stethoscope,
  FlaskConical,
  Scan,
  Dna,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Demo credential table (6 roles) ──────────────────────────────────────────
const DEMO_CREDS = [
  {
    role: 'Cardiologist',
    email: 'cardio@cardioevidence.demo',
    password: 'Cardio@123',
    icon: Stethoscope,
    badge: 'bg-sky-900/60 text-sky-300 border-sky-700',
    desc: 'Full multidisciplinary access — all clinical areas'
  },
  {
    role: 'Pathologist',
    email: 'pathology@cardioevidence.demo',
    password: 'Pathology@123',
    icon: FlaskConical,
    badge: 'bg-violet-900/60 text-violet-300 border-violet-700',
    desc: 'Pathology + Specimen Lineage'
  },
  {
    role: 'Imaging Specialist',
    email: 'imaging@cardioevidence.demo',
    password: 'Imaging@123',
    icon: Scan,
    badge: 'bg-teal-900/60 text-teal-300 border-teal-700',
    desc: 'Imaging workspace only'
  },
  {
    role: 'Molecular Specialist',
    email: 'molecular@cardioevidence.demo',
    password: 'Molecular@123',
    icon: Dna,
    badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
    desc: 'Molecular + Specimen Lineage'
  },
  {
    role: 'Reviewer',
    email: 'reviewer@cardioevidence.demo',
    password: 'Reviewer@123',
    icon: ClipboardCheck,
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700',
    desc: 'Full read access + Review Decisions + Audit'
  },
  {
    role: 'Administrator',
    email: 'admin@cardioevidence.demo',
    password: 'Admin@123',
    icon: ShieldCheck,
    badge: 'bg-rose-900/60 text-rose-300 border-rose-700',
    desc: 'System administration + Audit + Settings'
  },
];

// ─── Component ─────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showCreds, setShowCreds]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setIsSubmitting(true);
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCreds = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">

          {/* Brand */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-xl shadow-sky-500/30 mb-4">
              <Activity size={30} className="animate-pulse" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">CardioEvidence</h1>
            <p className="text-sm text-sky-400 font-medium mt-1">Multidisciplinary Clinical Evidence Timeline Platform</p>
            <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
              Sign in with your professional account. Access level is determined by your credentials.
            </p>
          </div>

          {/* Login card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-950/60 border border-rose-700/60 rounded-xl p-3.5 text-rose-300 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="email" type="email" autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@cardioevidence.demo"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/70 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-700/70 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors disabled:opacity-60"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <button
                type="button"
                onClick={() => setShowCreds((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Staff Accounts ({DEMO_CREDS.length} users)
                </span>
                {showCreds ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showCreds && (
                <div className="mt-3 space-y-1.5">
                  {DEMO_CREDS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        key={cred.role}
                        type="button"
                        onClick={() => fillCreds(cred.email, cred.password)}
                        className={`w-full text-left p-3 rounded-xl border ${cred.badge} hover:opacity-90 transition-opacity`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Icon size={14} className="flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold">{cred.role}</span>
                              <span className="text-[10px] opacity-60 font-mono flex-shrink-0">{cred.password}</span>
                            </div>
                            <div className="text-[10px] opacity-60 truncate font-mono mt-0.5">{cred.email}</div>
                            <div className="text-[10px] opacity-50 mt-0.5">{cred.desc}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-slate-600 text-center pt-1">
                    Click a row to auto-fill credentials
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-600 font-mono">
            CardioEvidence • Multi-Vendor Multidisciplinary Evidence Platform
          </p>
        </div>
      </div>
    </div>
  );
};
