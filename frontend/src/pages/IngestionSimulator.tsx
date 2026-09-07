import React, { useState, useEffect } from 'react';
import {
  HardDriveUpload,
  FlaskConical,
  Scan,
  Dna,
  FolderPlus,
  AlertTriangle,
  Clock,
  GitFork,
  CheckCircle2,
  RefreshCw,
  Server,
  Activity
} from 'lucide-react';
import { generateIngestionEvent, getIngestionStats } from '../services/api';
import { useRole } from '../context/RoleContext';
import { Badge } from '../components/common/Badge';

interface IngestionSimulatorProps {
  onSelectCase: (caseId: string) => void;
}

export const IngestionSimulator: React.FC<IngestionSimulatorProps> = ({ onSelectCase }) => {
  const { currentRole } = useRole();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<any>(null);
  const [targetCaseId, setTargetCaseId] = useState('CASE-1001');

  const loadStats = async () => {
    try {
      const data = await getIngestionStats(currentRole);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [currentRole]);

  const handleGenerate = async (actionType: string) => {
    setLoading(true);
    setLastAction(null);
    try {
      const res = await generateIngestionEvent(actionType, targetCaseId, currentRole);
      setLastAction(res);
      await loadStats();
    } catch (err: any) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                Multi-Vendor Data Ingestion Simulator
              </span>
              <span className="text-xs text-slate-500 font-mono">Simulated Ingest Pipeline</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Diagnostic Vendor Transmission Gateway
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Simulates real-time incoming diagnostic data streams from Vendor A (CoreLab LIMS),
              Vendor B (CardioVision PACS), and Vendor C (GeneCore NGS) with live schema normalization
              and quality validation.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Attach to Case:</span>
            <input
              type="text"
              value={targetCaseId}
              onChange={(e) => setTargetCaseId(e.target.value)}
              placeholder="e.g. CASE-1001"
              className="bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs w-28 text-slate-900 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Real-time Ingestion Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Records Received
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {stats?.records_received ?? '—'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">HL7 FHIR / DICOM</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Records Accepted
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {stats?.records_accepted ?? '—'}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Validated & Linked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
            Records Rejected
          </span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">
            {stats?.records_rejected ?? '—'}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Quality gate hold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Validation Errors
          </span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {stats?.validation_errors ?? '—'}
          </span>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Discordant schemas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
            Duplicate Records
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {stats?.duplicate_records ?? '—'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Duplicate Event IDs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
            Linkage Errors
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            {stats?.linkage_errors ?? '—'}
          </span>
          <span className="text-[10px] text-rose-500 mt-0.5 block">Lineage mismatches</span>
        </div>
      </div>

      {/* Status Alert if action executed */}
      {lastAction && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="block font-bold">Ingestion Transaction Committed!</strong>
              <span>
                {lastAction.message ||
                  `Generated ${lastAction.modality} Event ID: ${lastAction.event_id} for ${lastAction.case_id}`}
              </span>
            </div>
          </div>
          {lastAction.case_id && (
            <button
              onClick={() => onSelectCase(lastAction.case_id)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
            >
              Open Case {lastAction.case_id} →
            </button>
          )}
        </div>
      )}

      {/* Simulator Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Single Diagnostic Stream Emitters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity size={15} className="text-sky-600" />
              Emit Individual Vendor Stream Event
            </h3>
            <p className="text-xs text-slate-500">
              Transmit a single newly generated test result to target case {targetCaseId}
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => handleGenerate('pathology')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-600 text-white rounded-md">
                  <FlaskConical size={16} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Vendor A — CoreLab Diagnostics</span>
                  <span className="text-[11px] text-slate-500">Generate Serum Troponin I / Biomarker</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded border border-emerald-200 shadow-2xs">
                [Generate Pathology Event]
              </span>
            </button>

            <button
              onClick={() => handleGenerate('imaging')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-sky-200 bg-sky-50/40 hover:bg-sky-50 text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-sky-600 text-white rounded-md">
                  <Scan size={16} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Vendor B — CardioVision PACS</span>
                  <span className="text-[11px] text-slate-500">Generate 2D Echocardiogram / CT Report</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-sky-700 bg-white px-2.5 py-1 rounded border border-sky-200 shadow-2xs">
                [Generate Imaging Event]
              </span>
            </button>

            <button
              onClick={() => handleGenerate('molecular')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/40 hover:bg-purple-50 text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-600 text-white rounded-md">
                  <Dna size={16} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Vendor C — GeneCore Sequencing</span>
                  <span className="text-[11px] text-slate-500">Generate Inherited Arrhythmia NGS Panel</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-white px-2.5 py-1 rounded border border-purple-200 shadow-2xs">
                [Generate Molecular Event]
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Complete Synthetic Case Cohort Generators */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FolderPlus size={15} className="text-indigo-600" />
              Generate Synthetic Multi-Modality Case
            </h3>
            <p className="text-xs text-slate-500">
              Instantiate complete or anomalous case records with pre-linked diagnostic tests
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => handleGenerate('complete_case')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/30 text-slate-800 transition-colors"
            >
              <div className="text-left">
                <span className="text-xs font-bold block">Complete 3-Modality Case</span>
                <span className="text-[11px] text-slate-500">Generates Pathology, Imaging, and Molecular</span>
              </div>
              <span className="text-xs font-semibold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                [Generate Complete Case]
              </span>
            </button>

            <button
              onClick={() => handleGenerate('missing_case')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-rose-300 bg-slate-50 hover:bg-rose-50/30 text-slate-800 transition-colors"
            >
              <div className="text-left">
                <span className="text-xs font-bold block">Missing Evidence Scenario</span>
                <span className="text-[11px] text-slate-500">Case with absent imaging and molecular</span>
              </div>
              <span className="text-xs font-semibold text-rose-700 bg-white px-2.5 py-1 rounded border border-rose-200">
                [Generate Missing Evidence Case]
              </span>
            </button>

            <button
              onClick={() => handleGenerate('stale_case')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50/30 text-slate-800 transition-colors"
            >
              <div className="text-left">
                <span className="text-xs font-bold block">Stale Evidence Scenario</span>
                <span className="text-[11px] text-slate-500">Diagnostic reports older than 35 days</span>
              </div>
              <span className="text-xs font-semibold text-amber-800 bg-white px-2.5 py-1 rounded border border-amber-200">
                [Generate Stale Evidence Case]
              </span>
            </button>

            <button
              onClick={() => handleGenerate('lineage_case')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-rose-400 bg-slate-50 hover:bg-rose-50/40 text-slate-800 transition-colors"
            >
              <div className="text-left">
                <span className="text-xs font-bold block">Lineage Discrepancy Case</span>
                <span className="text-[11px] text-slate-500">Includes SPEC-UNKNOWN-99 mismatch</span>
              </div>
              <span className="text-xs font-semibold text-rose-800 bg-white px-2.5 py-1 rounded border border-rose-300">
                [Generate Lineage Error]
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
