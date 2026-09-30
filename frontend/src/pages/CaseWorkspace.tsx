import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  FlaskConical,
  Scan,
  Dna,
  GitFork,
  ClipboardCheck,
  History,
  LayoutGrid,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Lock,
  PlusCircle,
  CheckCircle2,
  FileText,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CaseItem, EvidenceEventItem, LineageGraphResponse, ReviewDecisionItem, AuditLogItem } from '../types';
import {
  getCaseDetail,
  getCaseTimeline,
  getCaseSpecimens,
  getCaseReviews,
  getCaseAudit
} from '../services/api';
import { useRole } from '../context/RoleContext';
import { ROLE_WORKSPACE_TABS } from '../context/RoleContext';
import { EvidenceTimeline } from '../components/timeline/EvidenceTimeline';
import { LineageGraph } from '../components/specimen/LineageGraph';
import { EvidenceDrilldownModal } from '../components/timeline/EvidenceDrilldownModal';
import { ReviewFormModal } from '../components/review/ReviewFormModal';
import { FreshnessDot } from '../components/common/FreshnessDot';
import { ModalityIcon } from '../components/common/ModalityIcon';
import { Badge } from '../components/common/Badge';
import { useWebSocket } from '../hooks/useWebSocket';

interface CaseWorkspaceProps {
  caseId: string;
  onBack: () => void;
  initialTab?: string;
}

export const CaseWorkspace: React.FC<CaseWorkspaceProps> = ({
  caseId,
  onBack,
  initialTab = 'timeline'
}) => {
  const { currentRole, currentUser } = useRole();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [caseDetail, setCaseDetail] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EvidenceEventItem[]>([]);
  const [specimenLineage, setSpecimenLineage] = useState<LineageGraphResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewDecisionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeline controls
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedModality, setSelectedModality] = useState('All');

  // Modals
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Real-time state
  const [liveNotification, setLiveNotification] = useState<string | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const WS_URL = API.replace('http', 'ws') + '/ws/events';

  // ─── Role-conditional data loading ────────────────────────────────────────
  // Only fetch what the authenticated role is authorized to access.
  // This prevents unnecessary 403 errors from specialists hitting endpoints
  // they don't have permission for.
  const loadCaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Every role needs basic case detail
      const detail = await getCaseDetail(caseId, currentRole);
      setCaseDetail(detail);

      // Timeline — Cardiologist, Reviewer get full timeline.
      // Specialists get modality-filtered timeline from the backend.
      const needsTimeline = ['Cardiologist', 'Reviewer', 'Pathologist', 'Imaging Specialist', 'Molecular Specialist'].includes(currentRole);
      if (needsTimeline) {
        const tl = await getCaseTimeline(caseId, sortOrder, selectedModality, currentRole);
        setTimelineEvents(tl.events ?? []);
      }

      // Specimens — Cardiologist, Pathologist, Molecular Specialist, Reviewer
      const needsSpecimens = ['Cardiologist', 'Pathologist', 'Molecular Specialist', 'Reviewer'].includes(currentRole);
      if (needsSpecimens) {
        const specs = await getCaseSpecimens(caseId, currentRole);
        setSpecimenLineage(specs);
      }

      // Reviews — Cardiologist and Reviewer only
      const needsReviews = ['Cardiologist', 'Reviewer'].includes(currentRole);
      if (needsReviews) {
        const revs = await getCaseReviews(caseId, currentRole);
        setReviews(revs);
      }

      // Audit — Cardiologist, Reviewer, Administrator
      const needsAudit = ['Cardiologist', 'Reviewer', 'Administrator'].includes(currentRole);
      if (needsAudit) {
        const aud = await getCaseAudit(caseId, currentRole);
        setAuditLogs(aud);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load case workspace');
    } finally {
      setLoading(false);
    }
  };

  // Real-time refresh: reload timeline when this case's events arrive via WebSocket
  const refreshTimeline = useCallback(async () => {
    try {
      const needsTimeline = ['Cardiologist', 'Reviewer', 'Pathologist', 'Imaging Specialist', 'Molecular Specialist'].includes(currentRole);
      if (needsTimeline) {
        const tl = await getCaseTimeline(caseId, sortOrder, selectedModality, currentRole);
        setTimelineEvents(tl.events ?? []);
      }
      const detail = await getCaseDetail(caseId, currentRole);
      setCaseDetail(detail);
    } catch { /* non-fatal */ }
  }, [caseId, currentRole, sortOrder, selectedModality]);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'new_event' && (msg.case_id === caseId || !msg.case_id)) {
      const notif = msg.message || `New ${msg.modality || 'diagnostic'} evidence received`;
      setLiveNotification(notif);
      if (notifTimer.current) clearTimeout(notifTimer.current);
      notifTimer.current = setTimeout(() => setLiveNotification(null), 5000);

      // Debounced timeline reload
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => refreshTimeline(), 800);
    }
  }, [caseId, refreshTimeline]);

  const { isConnected: wsConnected } = useWebSocket({ url: WS_URL, onMessage: handleWsMessage });

  useEffect(() => {
    loadCaseData();
  }, [caseId, currentRole, sortOrder, selectedModality]);

  if (loading && !caseDetail) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Assembling Case Timeline for {caseId}...</p>
      </div>
    );
  }

  if (error || !caseDetail) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
        <AlertTriangle size={36} className="text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Case Access Blocked / Failed</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto">{error || 'Case not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
        >
          Return to Cases
        </button>
      </div>
    );
  }

  const c = caseDetail.case;
  const evalData = caseDetail.evaluation;
  const isRestricted = c.consent_status === 'Restricted';

  const allowedWorkspaceTabs = ROLE_WORKSPACE_TABS[currentRole] ?? ['overview'];

  const allTabs = [
    { key: 'overview',  label: 'Overview',          icon: LayoutGrid },
    { key: 'timeline',  label: 'Evidence Timeline',  icon: Clock,         count: timelineEvents.length },
    { key: 'pathology', label: 'Pathology',           icon: FlaskConical },
    { key: 'imaging',   label: 'Imaging',             icon: Scan },
    { key: 'molecular', label: 'Molecular',           icon: Dna },
    { key: 'lineage',   label: 'Specimen Lineage',    icon: GitFork,       warning: specimenLineage?.has_mismatch },
    { key: 'reviews',   label: 'Review Decisions',    icon: ClipboardCheck, count: reviews.length },
    { key: 'audit',     label: 'Audit Trail',         icon: History,       count: auditLogs.length },
  ];

  const tabs = allTabs.filter((t) => allowedWorkspaceTabs.includes(t.key));


  // Specific modality filters
  const pathologyEvents = timelineEvents.filter((e) => e.modality.toLowerCase() === 'pathology');
  const imagingEvents = timelineEvents.filter((e) => e.modality.toLowerCase() === 'imaging');
  const molecularEvents = timelineEvents.filter((e) => e.modality.toLowerCase() === 'molecular');

  return (
    <div className="space-y-5">
      {/* Live WebSocket notification */}
      {liveNotification && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl animate-pulse">
          <Activity size={14} className="text-emerald-600" />
          {liveNotification}
          <span className="ml-auto text-emerald-500 text-[10px]">Timeline updated automatically</span>
        </div>
      )}

      {/* Back navigation & Quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Cases Registry</span>
        </button>

        <div className="flex items-center gap-2">
          {/* WS indicator */}
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${wsConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {wsConnected ? 'Live' : 'Offline'}
          </span>
          {['Cardiologist', 'Reviewer'].includes(currentRole) && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle size={14} />
              <span>Record Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {c.case_id}
              </h2>
              <Badge
                variant={
                  c.status === 'Complete'
                    ? 'success'
                    : c.status === 'Incomplete' || c.status === 'Blocked'
                    ? 'danger'
                    : 'warning'
                }
                size="md"
              >
                {c.status}
              </Badge>
              {isRestricted && (
                <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <Lock size={12} /> Restricted Consent Policy
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <span>Patient: <strong className="text-slate-700 font-mono">{c.patient_synthetic_id}</strong></span>
              <span>•</span>
              <span>Demographics: <strong className="text-slate-700">{c.gender}, {c.age_range} yrs</strong></span>
              <span>•</span>
              <span>Risk: <strong className={c.risk_level === 'High' ? 'text-rose-600' : 'text-slate-700'}>{c.risk_level}</strong></span>
              <span>•</span>
              <span>Consent: <strong className="text-slate-700">{c.consent_status}</strong></span>
              <span>•</span>
              <span>Viewing Role: <strong className="text-sky-700">{currentRole}</strong></span>
            </div>
          </div>

          {/* Completeness Engine Widget */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl min-w-[240px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Evidence Completeness
              </span>
              <span className="font-bold text-slate-900 font-mono">
                {evalData.completeness_percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  evalData.completeness_percentage === 100
                    ? 'bg-emerald-500'
                    : evalData.completeness_percentage >= 66
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${evalData.completeness_percentage}%` }}
              />
            </div>

            {/* Incomplete Warning if missing required streams */}
            {!evalData.is_complete && (
              <div className="mt-2 text-[10px] font-semibold text-rose-700 flex items-center gap-1">
                <AlertTriangle size={11} className="flex-shrink-0" />
                <span>
                  CASE REVIEW INCOMPLETE • Missing: {evalData.missing_modalities.join(', ') || 'Fresh lab data'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 mt-6 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-sky-200 text-sky-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
                {t.warning && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Warning banner for incomplete cases */}
            {!evalData.is_complete && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Multidisciplinary Review Notice</h4>
                  <p className="mt-0.5 text-amber-800">
                    Timeline cannot be considered complete. Required diagnostic modality streams are
                    either omitted or fail freshness thresholds. Order complementary testing or retrieve
                    archived studies prior to diagnostic sign-off.
                  </p>
                </div>
              </div>
            )}

            {/* Modality Health 3-Card Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pathology Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ModalityIcon modality="Pathology" size={16} />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">Pathology Stream</h4>
                  </div>
                  <FreshnessDot freshness={evalData.modality_summary.pathology.freshness} showLabel />
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold block text-slate-800">
                    {evalData.modality_summary.pathology.latest_test || 'No pathology tests recorded'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {evalData.modality_summary.pathology.latest_result || 'Result unavailable'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('pathology')}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 block"
                >
                  View all pathology tests ({evalData.modality_summary.pathology.count}) →
                </button>
              </div>

              {/* Imaging Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ModalityIcon modality="Imaging" size={16} />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">Imaging Stream</h4>
                  </div>
                  <FreshnessDot freshness={evalData.modality_summary.imaging.freshness} showLabel />
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold block text-slate-800">
                    {evalData.modality_summary.imaging.latest_test || 'No imaging studies recorded'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {evalData.modality_summary.imaging.latest_result || 'Report unavailable'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('imaging')}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 block"
                >
                  View all imaging studies ({evalData.modality_summary.imaging.count}) →
                </button>
              </div>

              {/* Molecular Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ModalityIcon modality="Molecular" size={16} />
                    <h4 className="text-xs font-bold text-slate-900 uppercase">Molecular Stream</h4>
                  </div>
                  <FreshnessDot freshness={evalData.modality_summary.molecular.freshness} showLabel />
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold block text-slate-800">
                    {evalData.modality_summary.molecular.latest_test || 'No genetic panels recorded'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {evalData.modality_summary.molecular.latest_result || 'Result unavailable'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('molecular')}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 block"
                >
                  View all molecular panels ({evalData.modality_summary.molecular.count}) →
                </button>
              </div>
            </div>

            {/* Recent Timeline Preview */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-sky-600" />
                  Recent Chronological Diagnostic Events
                </h3>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  Open Full Interactive Timeline →
                </button>
              </div>
              <EvidenceTimeline
                events={timelineEvents.slice(0, 3)}
                onSelectEvent={(id) => setSelectedEventId(id)}
                sortOrder={sortOrder}
                onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                selectedModality={selectedModality}
                onSelectModality={(m) => setSelectedModality(m)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Evidence Timeline */}
        {activeTab === 'timeline' && (
          <EvidenceTimeline
            events={timelineEvents}
            reviews={reviews}
            onSelectEvent={(id) => setSelectedEventId(id)}
            sortOrder={sortOrder}
            onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            selectedModality={selectedModality}
            onSelectModality={(m) => setSelectedModality(m)}
          />
        )}

        {/* Tab 3: Pathology */}
        {activeTab === 'pathology' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical size={16} className="text-emerald-600" />
                  Pathology & Laboratory Biomarkers
                </h3>
                <p className="text-xs text-slate-500">
                  Troponin, CK-MB, NT-proBNP, and myocardial histology reports
                </p>
              </div>
              <Badge variant="success">{pathologyEvents.length} Tests Recorded</Badge>
            </div>

            <EvidenceTimeline
              events={pathologyEvents}
              onSelectEvent={(id) => setSelectedEventId(id)}
              sortOrder={sortOrder}
              onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              selectedModality="Pathology"
              onSelectModality={() => {}}
            />
          </div>
        )}

        {/* Tab 4: Imaging */}
        {activeTab === 'imaging' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scan size={16} className="text-sky-600" />
                  Diagnostic Cardiovascular Imaging Studies
                </h3>
                <p className="text-xs text-slate-500">
                  Transthoracic Echocardiogram, Coronary CT Angiography, and Cardiac MRI reports
                </p>
              </div>
              <Badge variant="info">{imagingEvents.length} Studies Recorded</Badge>
            </div>

            <EvidenceTimeline
              events={imagingEvents}
              onSelectEvent={(id) => setSelectedEventId(id)}
              sortOrder={sortOrder}
              onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              selectedModality="Imaging"
              onSelectModality={() => {}}
            />
          </div>
        )}

        {/* Tab 5: Molecular */}
        {activeTab === 'molecular' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Dna size={16} className="text-purple-600" />
                  Molecular Diagnostics & Genetic Sequencing
                </h3>
                <p className="text-xs text-slate-500">
                  Cardiomyopathy targeted NGS panels, arrhythmogenic mutation screens, and PGx
                </p>
              </div>
              <Badge variant="purple">{molecularEvents.length} Panels Recorded</Badge>
            </div>

            {isRestricted && currentRole !== 'Administrator' && currentRole !== 'Reviewer' ? (
              <div className="p-8 rounded-xl bg-slate-100 border border-slate-300 text-center space-y-2">
                <Lock size={28} className="text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">
                  Evidence Visibility Restricted by Consent
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Patient consent policy restricts molecular and genetic diagnostic reporting. Only
                  Lead Reviewers and System Administrators are authorized to view raw genomic variants.
                </p>
              </div>
            ) : (
              <EvidenceTimeline
                events={molecularEvents}
                onSelectEvent={(id) => setSelectedEventId(id)}
                sortOrder={sortOrder}
                onToggleSort={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                selectedModality="Molecular"
                onSelectModality={() => {}}
              />
            )}
          </div>
        )}

        {/* Tab 6: Specimen Lineage */}
        {activeTab === 'lineage' && (
          <LineageGraph
            lineage={specimenLineage}
            onSelectEvent={(id) => setSelectedEventId(id)}
          />
        )}

        {/* Tab 7: Review Decisions */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-sky-600" />
                  Multidisciplinary Review Decisions ({reviews.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Consensus sign-offs, requested complementary evidence, and escalation logs
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                + Add Decision
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                No review decisions recorded yet for this case.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            r.status === 'Complete'
                              ? 'success'
                              : r.status === 'Needs More Evidence'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {r.status}
                        </Badge>
                        <span className="text-xs font-bold text-slate-800">
                          {r.reviewer_name} ({r.reviewer_role})
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      "{r.decision_text}"
                    </p>

                    {(r.missing_evidence_identified ||
                      r.stale_evidence_identified ||
                      r.lineage_issue_identified) && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                        {r.missing_evidence_identified && (
                          <div>
                            <strong className="text-rose-700">Missing flagged:</strong>{' '}
                            {r.missing_evidence_identified}
                          </div>
                        )}
                        {r.stale_evidence_identified && (
                          <div>
                            <strong className="text-amber-700">Stale flagged:</strong>{' '}
                            {r.stale_evidence_identified}
                          </div>
                        )}
                        {r.lineage_issue_identified && (
                          <div>
                            <strong className="text-rose-700">Lineage issue:</strong>{' '}
                            {r.lineage_issue_identified}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Case-Specific Audit Log ({auditLogs.length} entries)
                </h3>
                <p className="text-xs text-slate-500">
                  Immutable record of case queries, evidence views, and clinical actions
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User Role</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{log.user_role}</td>
                      <td className="py-2 px-3">{log.action}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                        {log.resource}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            log.result === 'SUCCESS'
                              ? 'success'
                              : log.result === 'BLOCKED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {log.result}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      {selectedEventId && (
        <EvidenceDrilldownModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* Review Decision Modal */}
      {isReviewModalOpen && (
        <ReviewFormModal
          caseId={caseId}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={loadCaseData}
        />
      )}
    </div>
  );
};
