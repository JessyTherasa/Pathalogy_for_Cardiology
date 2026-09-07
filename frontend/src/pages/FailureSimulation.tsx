import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  Copy,
  Users,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock,
  GitFork,
  Clock,
  FlaskConical
} from 'lucide-react';
import { triggerFailureApi } from '../services/api';
import { useRole } from '../context/RoleContext';
import { Badge } from '../components/common/Badge';

interface FailureSimulationProps {
  onSelectCase: (caseId: string) => void;
}

export const FailureSimulation: React.FC<FailureSimulationProps> = ({ onSelectCase }) => {
  const { currentRole } = useRole();
  const [targetCase, setTargetCase] = useState('CASE-1001');
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFailure = async (type: any, params: Record<string, any> = {}) => {
    setRunning(type);
    setResult(null);
    setError(null);
    try {
      const res = await triggerFailureApi(type, { case_id: targetCase, ...params }, currentRole);
      setResult({ type, data: res });
    } catch (err: any) {
      if (type === 'unauthorized') {
        // Expected for unauthorized
        setResult({
          type,
          data: {
            status: 'blocked',
            message: err.message,
            audit_logged: true
          }
        });
      } else {
        setError(err.message || 'Simulation failed');
      }
    } finally {
      setRunning(null);
    }
  };

  const failureScenarios = [
    {
      id: 'missing',
      title: 'Failure Case 1 — Missing Pathology Evidence',
      icon: FlaskConical,
      color: 'border-rose-300 bg-rose-50/20 text-rose-800',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
      description:
        'Removes pathology evidence stream from the case. Completeness drops, triggering "CASE REVIEW INCOMPLETE" warning banner.',
      expected: '🔴 Missing Pathology • Status becomes Incomplete',
      action: () => runFailure('missing')
    },
    {
      id: 'stale',
      title: 'Failure Case 2 — Stale Diagnostic Imaging',
      icon: Clock,
      color: 'border-amber-300 bg-amber-50/20 text-amber-800',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      description:
        'Pushes imaging study timestamp back to 45 days ago (&gt;30d threshold). Freshness engine flags as Very Stale.',
      expected: '🟡 Stale Imaging warning badge in timeline & health card',
      action: () => runFailure('stale', { days_old: 45 })
    },
    {
      id: 'lineage',
      title: 'Failure Case 3 — Specimen Lineage Mismatch',
      icon: GitFork,
      color: 'border-rose-400 bg-rose-50/30 text-rose-900',
      btnColor: 'bg-rose-700 hover:bg-rose-800',
      description:
        'Mutates molecular specimen ID to unregistered identifier SPEC-999-ERR. Lineage engine halts linkage.',
      expected: '🔴 SPECIMEN LINEAGE MISMATCH banner & blocked review',
      action: () => runFailure('lineage', { mismatch_specimen_id: 'SPEC-999-ERR' })
    },
    {
      id: 'duplicate',
      title: 'Failure Case 4 — Duplicate Evidence Event',
      icon: Copy,
      color: 'border-sky-300 bg-sky-50/20 text-sky-900',
      btnColor: 'bg-sky-600 hover:bg-sky-700',
      description:
        'Injects duplicate event identifier from two distinct vendor systems (e.g. CoreLab vs Bedside POC).',
      expected: '⚠ Duplicate Evidence alert in timeline',
      action: () => runFailure('duplicate')
    },
    {
      id: 'conflict',
      title: 'Failure Case 5 — Conflicting Vendor Results',
      icon: AlertTriangle,
      color: 'border-amber-400 bg-amber-50/30 text-amber-900',
      btnColor: 'bg-amber-700 hover:bg-amber-800',
      description:
        'Injects contradictory findings (Normal 5.2 ng/L vs Severely Elevated 162 ng/L). Preserves both vendor reports.',
      expected: '⚠ Conflicting Evidence banner; preserves dual sources',
      action: () => runFailure('conflict')
    },
    {
      id: 'unauthorized',
      title: 'Failure Case 6 — Unauthorized Role Access',
      icon: Lock,
      color: 'border-purple-300 bg-purple-50/20 text-purple-900',
      btnColor: 'bg-purple-700 hover:bg-purple-800',
      description:
        'Attempts to access restricted consent genomic data under Cardiologist role without clearance.',
      expected: '🔒 Access Restricted (HTTP 403) & audit log entry',
      action: () => runFailure('unauthorized', { attempted_role: 'Cardiologist' })
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                Diagnostic Quality Testing Workbench
              </span>
              <span className="text-xs text-slate-500 font-mono">Edge Scenario Injection</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Failure & Anomaly Simulation Workbench
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Inject intentional clinical data anomalies into the live database to verify CardioEvidence
              detection engines, alerting banners, lineage graph warnings, and audit logging.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Target Case:</span>
            <select
              value={targetCase}
              onChange={(e) => setTargetCase(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
            >
              <option value="CASE-1001">CASE-1001 (Recommended Demo Case)</option>
              <option value="CASE-1002">CASE-1002 (Stale Lab)</option>
              <option value="CASE-1003">CASE-1003 (Lineage Case)</option>
              <option value="CASE-1004">CASE-1004 (Duplicate Case)</option>
              <option value="CASE-1005">CASE-1005 (Conflict / Restricted)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Output / Feedback Box */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="block font-bold">Failure Injection Successful!</strong>
              <span>
                {result.data.message || JSON.stringify(result.data)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelectCase(targetCase)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <span>Open Case {targetCase}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
          <AlertOctagon size={18} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of 6 Failure Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {failureScenarios.map((scen) => {
          const Icon = scen.icon;
          const isCurrentRunning = running === scen.id;

          return (
            <div
              key={scen.id}
              className={`rounded-xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${scen.color}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-white/80 px-2 py-0.5 rounded border border-slate-200 font-bold">
                    Scenario #{scen.id.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{scen.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{scen.description}</p>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-700">
                  <strong className="block text-slate-900 font-semibold mb-0.5">Expected UI Manifestation:</strong>
                  {scen.expected}
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={scen.action}
                  disabled={running !== null}
                  className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 ${scen.btnColor}`}
                >
                  {isCurrentRunning ? 'Simulating...' : 'Inject Scenario'}
                </button>

                <button
                  onClick={() => onSelectCase(targetCase)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Inspect Case →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
