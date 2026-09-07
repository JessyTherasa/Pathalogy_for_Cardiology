/**
 * CardioEvidence — Protected Route Guard
 * Redirects unauthenticated users to Login.
 * Shows role-aware "Access Restricted" for authenticated users lacking page permission.
 */

import React from 'react';
import { ShieldOff, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Props ────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  pageKey?: string;
  pageLabel?: string;        // Human-readable name for the restricted area
  allowedPages?: string[];
  onRedirectToLogin: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

// ─── Role colour map ──────────────────────────────────────────────────────
const ROLE_COLOUR: Record<string, string> = {
  Cardiologist:           'bg-sky-100 text-sky-700 border-sky-200',
  Pathologist:            'bg-violet-100 text-violet-700 border-violet-200',
  'Imaging Specialist':   'bg-teal-100 text-teal-700 border-teal-200',
  'Molecular Specialist': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Reviewer:               'bg-amber-100 text-amber-700 border-amber-200',
  Administrator:          'bg-rose-100 text-rose-700 border-rose-200',
};

// ─── Access Restricted page ────────────────────────────────────────────────
export const AccessRestricted: React.FC<{
  role?: string;
  pageLabel?: string;
  onBack?: () => void;
}> = ({ role, pageLabel, onBack }) => {
  const rolePill = ROLE_COLOUR[role ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 shadow-sm">
        <Lock size={28} className="text-rose-500" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>

      {/* Role badge */}
      {role && (
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${rolePill}`}>
            <ShieldOff size={11} />
            You are signed in as: {role}
          </span>
        </div>
      )}

      <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
        {pageLabel
          ? <>Your role does not have permission to access the <strong className="text-slate-700">{pageLabel}</strong> area.</>
          : 'Your current role does not have permission to access this section.'}
        {' '}To access this area, sign out and log in with an authorised account.
      </p>

      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition-colors"
        >
          <ArrowLeft size={15} />
          Return to Dashboard
        </button>
      )}
    </div>
  );
};

// ─── Guard component ────────────────────────────────────────────────────────
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  pageKey,
  pageLabel,
  allowedPages,
  onRedirectToLogin,
  onBack,
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    onRedirectToLogin();
    return null;
  }

  if (pageKey && allowedPages && !allowedPages.includes(pageKey)) {
    return (
      <AccessRestricted
        role={user?.role}
        pageLabel={pageLabel}
        onBack={onBack}
      />
    );
  }

  return <>{children}</>;
};
