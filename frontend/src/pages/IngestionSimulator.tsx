import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardDriveUpload, FlaskConical, Scan, Dna,
  AlertTriangle, Activity, Play, Square, Zap,
  Wifi, WifiOff, RefreshCw, GitFork, Clock
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { Badge } from '../components/common/Badge';
import { useWebSocket } from '../hooks/useWebSocket';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_URL = API.replace('http', 'ws') + '/ws/events';

const MODALITY_COLOR: Record<string, string> = {
  Pathology: 'text-violet-700 bg-violet-50 border-violet-200',
  Imaging: 'text-teal-700 bg-teal-50 border-teal-200',
  Molecular: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const MODALITY_ICON: Record<string, React.ReactNode> = {
  Pathology: <FlaskConical size={12} />,
  Imaging: <Scan size={12} />,
  Molecular: <Dna size={12} />,
};

interface LiveEvent {
  id: string;
  type: string;
  case_id?: string;
  modality?: string;
  vendor?: string;
  test_name?: string;
  result_summary?: string;
  validation_status?: string;
  message?: string;
  timestamp: string;
}

interface SimStats {
  generated: number;
  validated: number;
  rejected: number;
  normalized: number;
  added_to_timeline: number;
  errors: number;
  started_at?: string;
  last_event_at?: string;
}

const EMPTY_STATS: SimStats = {
  generated: 0, validated: 0, rejected: 0,
  normalized: 0, added_to_timeline: 0, errors: 0,
};

interface IngestionSimulatorProps {
  onSelectCase?: (caseId: string) => void;
}

export const IngestionSimulator: React.FC<IngestionSimulatorProps> = ({ onSelectCase }) => {
  const { currentRole } = useRole();
  const [isStreaming, setIsStreaming] = useState(false);
  const [frequency, setFrequency] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [modality, setModality] = useState('mixed');
  const [caseId, setCaseId] = useState('CASE-1001');
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState<SimStats>(EMPTY_STATS);
  const [actionLoading, setActionLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('cardio_auth_token') || '';
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'new_event') {
      const ev: LiveEvent = {
        id: msg.event_id || Math.random().toString(36).slice(2),
        type: 'new_event',
        case_id: msg.case_id,
        modality: msg.modality,
        vendor: msg.vendor,
        test_name: msg.test_name,
        result_summary: msg.result_summary,
        validation_status: msg.validation_status,
        message: msg.message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setLiveEvents(prev => [ev, ...prev].slice(0, 50));
    } else if (msg.type === 'stats_update' && msg.stats) {
      setStats(msg.stats);
    } else if (msg.type === 'stream_stopped') {
      setIsStreaming(false);
    }
  }, []);

  const { isConnected } = useWebSocket({
    url: WS_URL,
    onMessage: handleWsMessage,
  });

  // Auto-scroll feed to top when new events arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [liveEvents.length]);

  const callApi = async (path: string, method = 'POST', params?: Record<string, string>) => {
    const url = new URL(`${API}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { method, headers: authHeaders });
    return res.json();
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await callApi('/simulator/start', 'POST', {
        modality, frequency, ...(caseId ? { case_id: caseId } : {})
      });
      setIsStreaming(true);
      setStats(EMPTY_STATS);
    } catch (e: any) {
      alert('Failed to start stream: ' + e.message);
    } finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await callApi('/simulator/stop');
      setIsStreaming(false);
    } catch (e: any) {
      alert('Failed to stop: ' + e.message);
    } finally { setActionLoading(false); }
  };

  const handleGenerateOne = async () => {
    setActionLoading(true);
    try {
      await callApi('/simulator/generate-one', 'POST', {
        modality, ...(caseId ? { case_id: caseId } : {})
      });
    } catch (e: any) {
      alert('Failed to generate event: ' + e.message);
    } finally { setActionLoading(false); }
  };

  const handleInjectFailure = async (type: string) => {
    setActionLoading(true);
    try {
      const res = await callApi(`/ingestion/generate`, 'POST', {
        action_type: type, ...(caseId ? { case_id: caseId } : {})
      });
      if (res.case_id && onSelectCase) {
        // show the generated failure case
      }
    } catch (e: any) {
      alert('Failed: ' + e.message);
    } finally { setActionLoading(false); }
  };

  const StatBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className={`rounded-xl border p-3 text-center ${color}`}>
      <div className="text-2xl font-black font-mono">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                Real-Time Ingestion Simulator
              </span>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900">Synthetic Vendor Event Stream</h2>
            <p className="text-xs text-slate-500 mt-1">Generates real-time synthetic diagnostic events. Timeline updates automatically — no refresh needed.</p>
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-semibold">
            ⚠️ SYNTHETIC / DE-IDENTIFIED DATA ONLY
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatBox label="Generated" value={stats.generated} color="bg-sky-50 border-sky-200 text-sky-800" />
        <StatBox label="Validated" value={stats.validated} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
        <StatBox label="Normalized" value={stats.normalized} color="bg-teal-50 border-teal-200 text-teal-800" />
        <StatBox label="→ Timeline" value={stats.added_to_timeline} color="bg-violet-50 border-violet-200 text-violet-800" />
        <StatBox label="Rejected" value={stats.rejected} color="bg-amber-50 border-amber-200 text-amber-800" />
        <StatBox label="Errors" value={stats.errors} color="bg-rose-50 border-rose-200 text-rose-800" />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Stream Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Case ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Case</label>
            <input
              type="text"
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sky-500"
              placeholder="CASE-1001"
            />
          </div>

          {/* Modality */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modality</label>
            <select
              value={modality}
              onChange={e => setModality(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="mixed">Mixed (all modalities)</option>
              <option value="pathology">Pathology only</option>
              <option value="imaging">Imaging only</option>
              <option value="molecular">Molecular only</option>
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
            <div className="flex gap-2">
              {(['slow', 'normal', 'fast'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all capitalize ${
                    frequency === f
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >{f}</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Actions</label>
            <div className="flex gap-2">
              {!isStreaming ? (
                <button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play size={13} /> Start
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Square size={13} /> Stop
                </button>
              )}
              <button
                onClick={handleGenerateOne}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap size={13} /> One
              </button>
            </div>
          </div>
        </div>

        {/* Failure Injection */}
        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Inject Failure Scenario
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'missing_case', label: 'Missing Evidence', icon: '⚠️' },
              { type: 'stale_case', label: 'Stale Evidence', icon: '🕐' },
              { type: 'lineage_case', label: 'Lineage Mismatch', icon: '🔗' },
              { type: 'complete_case', label: 'Complete Case', icon: '✓' },
            ].map(f => (
              <button
                key={f.type}
                onClick={() => handleInjectFailure(f.type)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity size={15} className={isStreaming ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
            <span className="text-sm font-bold text-slate-800">Live Event Feed</span>
            <span className="text-xs text-slate-400 font-mono">{liveEvents.length} events</span>
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
              ● STREAMING
            </span>
          )}
        </div>
        <div ref={feedRef} className="h-96 overflow-y-auto p-3 space-y-2 bg-slate-950">
          {liveEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Start the stream or generate a single event to see live events here.
            </div>
          ) : (
            liveEvents.map((ev) => (
              <div key={ev.id + ev.timestamp} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400">{ev.timestamp}</span>
                  {ev.modality && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                      MODALITY_COLOR[ev.modality] || 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {MODALITY_ICON[ev.modality]}
                      {ev.modality}
                    </span>
                  )}
                  {ev.case_id && <span className="text-sky-400">{ev.case_id}</span>}
                  {ev.validation_status === 'Valid'
                    ? <span className="text-emerald-400">✓ VALID</span>
                    : <span className="text-amber-400">⚠ {ev.validation_status}</span>
                  }
                </div>
                <div className="mt-1 text-slate-300">
                  {ev.test_name && <span className="text-white font-semibold">{ev.test_name}</span>}
                  {ev.result_summary && <span className="text-slate-400 ml-2">→ {ev.result_summary}</span>}
                </div>
                {ev.vendor && <div className="text-slate-500 mt-0.5">{ev.vendor}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
