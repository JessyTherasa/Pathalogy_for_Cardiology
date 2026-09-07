import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  FlaskConical,
  Scan,
  Dna,
  GitFork,
  ClipboardCheck,
  AlertOctagon,
  Gauge,
  MessageSquareHeart,
  Network,
  History,
  HardDriveUpload,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
  selectedCaseId?: string;
}

// All possible navigation items across all roles
const ALL_NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',                    icon: LayoutDashboard },
  { key: 'cases',        label: 'Cases Registry',               icon: FolderKanban },
  { key: 'timeline',     label: 'Evidence Timeline',            icon: Clock,              badge: null },
  { key: 'pathology',    label: 'Pathology Stream',             icon: FlaskConical },
  { key: 'imaging',      label: 'Imaging Stream',               icon: Scan },
  { key: 'molecular',    label: 'Molecular Stream',             icon: Dna },
  { key: 'lineage',      label: 'Specimen Lineage',             icon: GitFork },
  { key: 'reviews',      label: 'Review Decisions',             icon: ClipboardCheck },
  { key: 'failures',     label: 'Failure Simulation',           icon: AlertOctagon,       badge: 'TEST' },
  { key: 'ingestion',    label: 'Data Ingestion',               icon: HardDriveUpload },
  { key: 'experiment',   label: 'Baseline vs CardioEvidence',   icon: Gauge },
  { key: 'error_analysis', label: 'Error Analysis',             icon: ShieldAlert },
  { key: 'workflow_map', label: 'Workflow Map',                 icon: Network },
  { key: 'feedback',     label: 'User Feedback',               icon: MessageSquareHeart },
  { key: 'audit',        label: 'Audit Trail',                  icon: History },
  { key: 'settings',     label: 'System Settings',             icon: SettingsIcon },
];

// Role-specific colour accent for the active item
const ROLE_ACCENT: Record<string, string> = {
  Cardiologist:          'bg-sky-50 text-sky-800 border-sky-200',
  Pathologist:           'bg-violet-50 text-violet-800 border-violet-200',
  'Imaging Specialist':  'bg-teal-50 text-teal-800 border-teal-200',
  'Molecular Specialist':'bg-emerald-50 text-emerald-800 border-emerald-200',
  Reviewer:              'bg-amber-50 text-amber-800 border-amber-200',
  Administrator:         'bg-rose-50 text-rose-800 border-rose-200',
};

const ROLE_ICON_ACTIVE: Record<string, string> = {
  Cardiologist:          'text-sky-600',
  Pathologist:           'text-violet-600',
  'Imaging Specialist':  'text-teal-600',
  'Molecular Specialist':'text-emerald-600',
  Reviewer:              'text-amber-600',
  Administrator:         'text-rose-600',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  selectedCaseId
}) => {
  const { currentRole, isPageAllowed } = useRole();

  const accentActive = ROLE_ACCENT[currentRole] ?? 'bg-sky-50 text-sky-800 border-sky-200';
  const iconActive   = ROLE_ICON_ACTIVE[currentRole] ?? 'text-sky-600';

  // Only show items this role is allowed to see — no grayed-out locked items
  const visibleItems = ALL_NAV_ITEMS.filter((item) => isPageAllowed(item.key));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-[calc(100vh-6rem)] sticky top-24 overflow-y-auto">
      <div className="p-4 border-b border-slate-100">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Clinical Navigation
        </div>
        <div className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            Role: <strong>{currentRole}</strong>
          </span>
        </div>
      </div>

      <nav className="p-3 space-y-0.5 flex-1">
        {visibleItems.map((item) => {
          const active = currentPage === item.key;
          const Icon = item.icon;
          const label = item.key === 'timeline' && selectedCaseId
            ? `Timeline (${selectedCaseId})`
            : item.label;

          return (
            <button
              key={item.key}
              onClick={() => onSelectPage(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? `${accentActive} font-semibold border shadow-sm`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={15} className={active ? iconActive : 'text-slate-400'} />
                <span>{label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* RBAC enforcement notice */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500">
        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          <ShieldCheck size={13} className={iconActive} />
          <span>RBAC Active</span>
        </div>
        <p className="leading-relaxed">
          Navigation is filtered to your authenticated role. Unauthorized areas are not shown.
        </p>
      </div>
    </aside>
  );
};
