import React, { useState } from 'react';
import { X, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { submitReviewDecision } from '../../services/api';

interface ReviewFormModalProps {
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  caseId,
  onClose,
  onSuccess
}) => {
  const { currentRole, currentUser } = useRole();
  const [status, setStatus] = useState<string>('Complete');
  const [decisionText, setDecisionText] = useState<string>('');
  const [missingEvidence, setMissingEvidence] = useState<string>('');
  const [staleEvidence, setStaleEvidence] = useState<string>('');
  const [lineageIssue, setLineageIssue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = [
    'Complete',
    'Needs More Evidence',
    'In Review',
    'Escalated',
    'Not Started'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionText.trim()) {
      setError('Please provide review notes or decision rationale.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReviewDecision(
        {
          case_id: caseId,
          reviewer_role: currentRole,
          reviewer_name: currentUser.name,
          status,
          decision_text: decisionText,
          missing_evidence_identified: missingEvidence || undefined,
          stale_evidence_identified: staleEvidence || undefined,
          lineage_issue_identified: lineageIssue || undefined
        },
        currentRole
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-600 text-white">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Review Decision</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {caseId} • Reviewer: {currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Review Status Decision *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clinical Review Notes / Rationale *
            </label>
            <textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              rows={3}
              placeholder="Record multidisciplinary panel evaluation, concordance notes, or rationale..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Flag Identified Quality & Completeness Issues (Optional)
            </span>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Missing Evidence Identified
              </label>
              <input
                type="text"
                value={missingEvidence}
                onChange={(e) => setMissingEvidence(e.target.value)}
                placeholder="e.g. Molecular NGS Cardiomyopathy Panel"
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Stale Evidence Identified
              </label>
              <input
                type="text"
                value={staleEvidence}
                onChange={(e) => setStaleEvidence(e.target.value)}
                placeholder="e.g. Troponin T lab result >35 days old"
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Lineage / Specimen Issue Identified
              </label>
              <input
                type="text"
                value={lineageIssue}
                onChange={(e) => setLineageIssue(e.target.value)}
                placeholder="e.g. Discordant specimen identifier SPEC-999"
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving Decision...' : 'Commit Review Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
