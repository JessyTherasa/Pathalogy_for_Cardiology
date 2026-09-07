import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  FlaskConical,
  Scan,
  Dna,
  Server,
  Layers,
  Cpu,
  GitCommit,
  ShieldCheck,
  Calendar,
  Tag,
  Copy,
  Check
} from 'lucide-react';
import { EvidenceDetail } from '../../types';
import { getEvidenceDetail } from '../../services/api';
import { useRole } from '../../context/RoleContext';
import { FreshnessDot } from '../common/FreshnessDot';
import { ModalityIcon } from '../common/ModalityIcon';
import { Badge } from '../common/Badge';

interface EvidenceDrilldownModalProps {
  eventId: string | null;
  onClose: () => void;
}

export const EvidenceDrilldownModal: React.FC<EvidenceDrilldownModalProps> = ({
  eventId,
  onClose
}) => {
  const { currentRole } = useRole();
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEvidenceDetail(eventId, currentRole);
        setEvidence(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load evidence details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [eventId, currentRole]);

  if (!eventId) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            {evidence && <ModalityIcon modality={evidence.modality} size={22} />}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {evidence ? evidence.test_name : 'Evidence Drill-Down'}
                </h3>
                {evidence && (
                  <Badge
                    variant={
                      evidence.validation_status === 'Valid'
                        ? 'success'
                        : evidence.validation_status === 'Duplicate'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {evidence.validation_status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Event ID: {eventId} {evidence ? `• Case: ${evidence.case_id}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-100px)] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading evidence record...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Access Restriction / Query Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {evidence && (
            <>
              {/* Primary Diagnostic Finding Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>Diagnostic Finding / Normalized Result</span>
                  <FreshnessDot freshness={evidence.freshness} showLabel />
                </div>
                <div className="text-sm font-semibold text-slate-900 bg-white p-3 rounded-lg border border-slate-200/80 shadow-sm">
                  {evidence.result_summary}
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Interpretation:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      evidence.interpretation.toLowerCase().includes('normal') ||
                      evidence.interpretation.toLowerCase().includes('benign')
                        ? 'bg-emerald-100 text-emerald-800'
                        : evidence.interpretation.toLowerCase().includes('abnormal') ||
                          evidence.interpretation.toLowerCase().includes('pathogenic')
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {evidence.interpretation}
                  </span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                  Technical Specifications & Specimen Linkage
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Vendor System</span>
                    <span className="font-semibold text-slate-800">{evidence.vendor}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Modality</span>
                    <span className="font-semibold text-slate-800">{evidence.modality}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Analyzer Device</span>
                    <span className="font-semibold text-slate-800">{evidence.device_system}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Specimen ID</span>
                    <span className="font-semibold text-slate-800">
                      {evidence.specimen_id || 'None (In-Vivo Imaging)'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Source Interface</span>
                    <span className="font-semibold text-slate-800">{evidence.source_system}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Review State</span>
                    <span className="font-semibold text-slate-800">{evidence.review_status}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block">Observation Timestamp</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(evidence.event_timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 col-span-2">
                    <span className="text-slate-600 block">Ingestion Ingest Time</span>
                    <span className="font-semibold text-slate-800">
                      {evidence.ingestion_timestamp
                        ? new Date(evidence.ingestion_timestamp).toLocaleString()
                        : 'Simulated realtime ingest'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence Provenance Pipeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers size={14} className="text-sky-600" />
                    Evidence Provenance & Audit Pipeline
                  </h4>
                  <span className="text-[10px] text-slate-600">6-Stage Verified Audit Path</span>
                </div>

                <div className="relative border-l-2 border-sky-300 ml-3 pl-4 space-y-4 py-1">
                  {evidence.provenance?.map((prov, index) => (
                    <div key={index} className="relative group">
                      <div className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full bg-white border-2 border-sky-600 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                      </div>
                      <div className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-lg border border-slate-200 transition-colors">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-bold text-slate-900">{prov.step}</span>
                          <span className="text-[11px] text-slate-600 font-mono">
                            {new Date(prov.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{prov.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                          <span>System: <strong className="text-slate-800">{prov.system}</strong></span>
                          <span>•</span>
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                            {prov.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => handleCopy(JSON.stringify(evidence, null, 2))}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied JSON payload' : 'Copy Evidence JSON'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
