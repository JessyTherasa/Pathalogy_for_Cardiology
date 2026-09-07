import React, { useState } from 'react';
import {
  Activity,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { resetDatabase } from '../../services/api';

interface HeaderProps {
  onRefreshData?: () => void;
}

// Role → colour accent map for the avatar chip
const ROLE_COLOUR: Record<string, string> = {
  Cardiologist:           'bg-sky-600',
  Pathologist:            'bg-violet-600',
  'Imaging Specialist':   'bg-teal-600',
  'Molecular Specialist': 'bg-emerald-600',
  Reviewer:               'bg-amber-600',
  Administrator:          'bg-rose-600',
};

// Role → workspace context label shown in header (makes demo obvious at a glance)
const ROLE_WORKSPACE_LABEL: Record<string, string> = {
  Cardiologist:           'Access: Multidisciplinary',
  Pathologist:            'Workspace: Pathology',
  'Imaging Specialist':   'Workspace: Imaging',
  'Molecular Specialist': 'Workspace: Molecular',
  Reviewer:               'Access: Review & Audit',
  Administrator:          'Access: System Admin',
};

export const Header: React.FC<HeaderProps> = ({ onRefreshData }) => {
  const { currentRole, currentUser } = useRole();
  const { user, logout } = useAuth();

  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const avatarBg = ROLE_COLOUR[currentRole] ?? 'bg-slate-600';
  const initials  = user?.initials ?? currentRole[0];

  const handleReset = async () => {
    if (confirm('Reset demo database to clean initial state (100+ cases, 500+ events)?')) {
      try {
        setIsResetting(true);
        await resetDatabase(currentRole);
        setResetMessage('Demo reset successfully!');
        if (onRefreshData) onRefreshData();
        setTimeout(() => setResetMessage(null), 3000);
      } catch (err: any) {
        alert(`Reset failed: ${err.message}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Synthetic data notice banner */}
      <div className="bg-amber-500 text-slate-950 px-4 py-1 text-xs font-semibold flex items-center justify-between tracking-wide">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-slate-950" />
          <span>SYNTHETIC DATA — DEMONSTRATION &amp; RESEARCH WORKFLOW PROTOTYPE ONLY • NOT FOR CLINICAL DECISION-MAKING</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-normal">
          <span>De-identified synthetic cohort</span>
          <span className="bg-slate-950 text-white px-2 py-0.5 rounded font-mono text-[10px]">v1.0-DEMO</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-100">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">CardioEvidence</span>
                <span className="text-[11px] font-medium bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                  Multidisciplinary Timeline
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Unified Diagnostic Integration Engine (Pathology • Imaging • Molecular)
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {resetMessage && (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 font-medium">
                <CheckCircle2 size={13} /> {resetMessage}
              </span>
            )}

            {/* Reset demo button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-50"
              title="Reset Demo Database"
            >
              <RotateCcw size={13} className={isResetting ? 'animate-spin' : ''} />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            {/* ── User profile chip + dropdown ── */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-all"
              >
                {/* Avatar */}
                <div className={`h-7 w-7 rounded-md ${avatarBg} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {initials}
                </div>

                {/* Name + role + workspace */}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight max-w-[140px] truncate">
                    {user?.name ?? currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">{currentRole}</div>
                  <div className="text-[9px] text-slate-400 leading-tight truncate max-w-[140px]">
                    {ROLE_WORKSPACE_LABEL[currentRole]}
                  </div>
                </div>

                <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown panel */}
              {showUserMenu && (
                <>
                  {/* Click-outside overlay */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${avatarBg} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {user?.name ?? currentUser.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                          <div className="text-xs text-slate-400 truncate">{currentUser.department}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${avatarBg}`}>
                          <User size={9} />
                          {currentRole}
                        </span>
                      </div>
                    </div>

                    {/* Logout action */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
