import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { CaseItem, DashboardMetrics } from '../types';
import { getCases, getDashboardMetrics } from '../services/api';
import { useRole } from '../context/RoleContext';
import { FreshnessDot } from '../components/common/FreshnessDot';
import { Badge } from '../components/common/Badge';

interface DashboardProps {
  onSelectCase: (caseId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCase }) => {
  const { currentRole } = useRole();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedModality, setSelectedModality] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedFreshness, setSelectedFreshness] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedConsent, setSelectedConsent] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        getDashboardMetrics(currentRole),
        getCases(
          {
            search,
            status: selectedStatus,
            modality: selectedModality,
            vendor: selectedVendor,
            freshness: selectedFreshness,
            risk: selectedRisk,
            consent: selectedConsent
          },
          currentRole
        )
      ]);
      setMetrics(m);
      setCases(c);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    search,
    selectedStatus,
    selectedModality,
    selectedVendor,
    selectedFreshness,
    selectedRisk,
    selectedConsent,
    currentRole
  ]);

  const demoCases = [
    {
      id: 'CASE-1001',
      title: 'Complete Case',
      desc: 'All 3 modalities current, complete specimen lineage',
      badge: '🟢 Complete',
      variant: 'success' as const
    },
    {
      id: 'CASE-1002',
      title: 'Stale Lab + Missing Molecular',
      desc: 'Troponin >35d old, molecular result unavailable',
      badge: '🟡 Stale 🔴 Missing',
      variant: 'warning' as const
    },
    {
      id: 'CASE-1003',
      title: 'Lineage Mismatch',
      desc: 'Molecular references foreign specimen SPEC-999',
      badge: '🔴 Lineage Error',
      variant: 'danger' as const
    },
    {
      id: 'CASE-1004',
      title: 'Duplicate Evidence',
      desc: 'Duplicated event ID across lab and bedside POC',
      badge: '⚠️ Duplicate',
      variant: 'warning' as const
    },
    {
      id: 'CASE-1005',
      title: 'Conflicting Results',
      desc: 'Discordant AI Echo vs Handheld Echo; Restricted Consent',
      badge: '⚠️ Conflict / Consent',
      variant: 'danger' as const
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-500/20 text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/30">
              CardioEvidence Workflow Suite
            </span>
            <span className="text-xs text-slate-400">Multi-Vendor Clinical Integration</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Multidisciplinary Clinical Evidence Timeline
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Unifying fragmented pathology, diagnostic imaging, and molecular genomics streams into
            an audit-verified timeline to dramatically reduce case review assembly duration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-mono">SYNTHETIC DATASET</div>
            <div className="text-lg font-black text-sky-400">
              {metrics ? `${metrics.total_cases} Cases • ${metrics.recent_events_count} Events` : 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Cases
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {metrics?.total_cases ?? '—'}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Synthetic cohort</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Complete Cases
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {metrics?.complete_cases ?? '—'}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">3/3 streams valid</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Needs Review
          </span>
          <span className="text-2xl font-black text-sky-700 mt-1 block">
            {metrics?.cases_needing_review ?? '—'}
          </span>
          <span className="text-[11px] text-sky-600 mt-0.5 block">Pending consensus</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Incomplete Cases
          </span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">
            {metrics?.incomplete_cases ?? '—'}
          </span>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Missing or blocked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
            Missing Evidence
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            {metrics?.missing_evidence_cases ?? '—'}
          </span>
          <span className="text-[11px] text-rose-500 mt-0.5 block">Omitted modality</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Stale Evidence
          </span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {metrics?.stale_evidence_cases ?? '—'}
          </span>
          <span className="text-[11px] text-amber-600 mt-0.5 block">&gt;7–30 days old</span>
        </div>
      </div>

      {/* Quick Demonstration Predefined Cases Bar */}
      <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-sky-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Evaluation Demonstration Scenarios (Pre-configured Showcase Cases)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">1-Click Demonstration Flow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {demoCases.map((dc) => (
            <button
              key={dc.id}
              onClick={() => onSelectCase(dc.id)}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/50 text-left transition-all group shadow-2xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-sky-800 group-hover:text-sky-900">
                  {dc.id}
                </span>
                <Badge variant={dc.variant} size="sm">
                  {dc.badge}
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-800">{dc.title}</p>
              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{dc.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Multi-Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID, Event ID, Specimen ID, Vendor, or Modality..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Reset Filters */}
          {(selectedStatus !== 'All' ||
            selectedModality !== 'All' ||
            selectedVendor !== 'All' ||
            selectedFreshness !== 'All' ||
            selectedRisk !== 'All' ||
            selectedConsent !== 'All' ||
            search !== '') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('All');
                setSelectedModality('All');
                setSelectedVendor('All');
                setSelectedFreshness('All');
                setSelectedRisk('All');
                setSelectedConsent('All');
              }}
              className="text-xs text-sky-700 hover:text-sky-900 font-medium px-2 py-1.5"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Incomplete">Incomplete</option>
              <option value="Blocked">Blocked</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Modality</label>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Modalities</option>
              <option value="Pathology">Pathology</option>
              <option value="Imaging">Imaging</option>
              <option value="Molecular">Molecular</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Vendors</option>
              <option value="Vendor A">Vendor A (CoreLab)</option>
              <option value="Vendor B">Vendor B (CardioVision)</option>
              <option value="Vendor C">Vendor C (GeneCore)</option>
              <option value="Vendor D">Vendor D (BioPulse POC)</option>
              <option value="Vendor E">Vendor E (UltraEcho)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Freshness</label>
            <select
              value={selectedFreshness}
              onChange={(e) => setSelectedFreshness(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Freshness</option>
              <option value="Current">Current (&lt;7d)</option>
              <option value="Stale">Stale (7-30d)</option>
              <option value="Very Stale">Very Stale (&gt;30d)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Risk Level</label>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Consent</label>
            <select
              value={selectedConsent}
              onChange={(e) => setSelectedConsent(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
            >
              <option value="All">All Consent</option>
              <option value="Granted">Granted</option>
              <option value="Restricted">Restricted</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Cases Registry ({cases.length} matching)
            </h3>
            <span className="text-[11px] text-slate-500">
              Click any case row to launch the multidisciplinary case workspace
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Role: {currentRole}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No cases match the specified filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Case ID</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Risk</th>
                  <th className="py-3 px-3">Consent</th>
                  <th className="py-3 px-3 text-center">Pathology</th>
                  <th className="py-3 px-3 text-center">Imaging</th>
                  <th className="py-3 px-3 text-center">Molecular</th>
                  <th className="py-3 px-3 text-center">Evidence Health</th>
                  <th className="py-3 px-3">Completeness</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c.case_id)}
                      className="hover:bg-sky-50/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-bold text-sky-700">
                        {c.case_id}
                        <span className="block text-[10px] text-slate-600 font-normal">
                          {c.patient_synthetic_id}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            c.status === 'Complete'
                              ? 'success'
                              : c.status === 'Incomplete' || c.status === 'Blocked'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            c.risk_level === 'High'
                              ? 'text-rose-700'
                              : c.risk_level === 'Moderate'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {c.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            c.consent_status === 'Granted'
                              ? 'success'
                              : c.consent_status === 'Restricted'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {c.consent_status === 'Restricted' ? '🔒 Restricted' : c.consent_status}
                        </Badge>
                      </td>

                      {/* Pathology Health */}
                      <td className="py-2.5 px-3 text-center">
                        <FreshnessDot freshness={c.pathology.freshness} />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {c.pathology.present ? `${c.pathology.count} tests` : 'None'}
                        </span>
                      </td>

                      {/* Imaging Health */}
                      <td className="py-2.5 px-3 text-center">
                        <FreshnessDot freshness={c.imaging.freshness} />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {c.imaging.present ? `${c.imaging.count} studies` : 'None'}
                        </span>
                      </td>

                      {/* Molecular Health */}
                      <td className="py-2.5 px-3 text-center">
                        <FreshnessDot freshness={c.molecular.freshness} />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {c.molecular.present ? `${c.molecular.count} panels` : 'None'}
                        </span>
                      </td>

                      {/* Evidence Health Badge */}
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={
                            c.evidence_health === 'Healthy'
                              ? 'success'
                              : c.evidence_health === 'Warning' || c.evidence_health === 'Incomplete'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {c.evidence_health}
                        </Badge>
                      </td>

                      {/* Completeness Bar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                c.completeness_percentage === 100
                                  ? 'bg-emerald-500'
                                  : c.completeness_percentage >= 66
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${c.completeness_percentage}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700">
                            {c.completeness_percentage}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.case_id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors font-medium text-[11px]"
                        >
                          <span>Review</span>
                          <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
