import React from 'react';
import {
  GitFork,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowDown,
  Layers,
  FlaskConical,
  Dna,
  Clock
} from 'lucide-react';
import { LineageGraphResponse, LineageNode } from '../../types';
import { ModalityIcon } from '../common/ModalityIcon';
import { Badge } from '../common/Badge';

interface LineageGraphProps {
  lineage: LineageGraphResponse | null;
  onSelectEvent?: (eventId: string) => void;
}

export const LineageGraph: React.FC<LineageGraphProps> = ({
  lineage,
  onSelectEvent
}) => {
  if (!lineage) {
    return (
      <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        Loading specimen lineage tree...
      </div>
    );
  }

  const renderNode = (node: LineageNode, depth: number = 0) => {
    const isMismatch = node.status === 'Mismatch' || node.type === 'Mismatch';

    return (
      <div key={node.id} className="relative ml-6 my-3">
        {/* Connection line */}
        <div className="absolute -left-4 top-4 w-4 h-0.5 bg-slate-300" />

        <div
          className={`p-3.5 rounded-xl border transition-all shadow-sm ${
            isMismatch
              ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-200'
              : node.type === 'Specimen'
              ? 'bg-sky-50/70 border-sky-200 text-slate-900'
              : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {node.type === 'Specimen' ? (
                <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                  <GitFork size={16} />
                </div>
              ) : isMismatch ? (
                <div className="p-1.5 rounded-lg bg-rose-600 text-white">
                  <AlertOctagon size={16} />
                </div>
              ) : (
                <ModalityIcon modality={node.type} size={16} />
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{node.label}</span>
                  {isMismatch && <Badge variant="danger">🔴 MISMATCH</Badge>}
                </div>
                {node.details?.source && (
                  <span className="text-[11px] text-slate-500">
                    Source: {node.details.source} • {node.details.type || ''}
                  </span>
                )}
                {node.details?.vendor && (
                  <span className="text-[11px] text-slate-500">
                    Vendor: {node.details.vendor} • Result: {node.details.result}
                  </span>
                )}
                {node.details?.error && (
                  <span className="text-[11px] font-semibold text-rose-700 block mt-0.5">
                    {node.details.error}
                  </span>
                )}
              </div>
            </div>

            {node.type !== 'Specimen' && node.type !== 'Mismatch' && onSelectEvent && (
              <button
                onClick={() => onSelectEvent(node.id)}
                className="text-[11px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded border border-sky-200 transition-colors"
              >
                Inspect
              </button>
            )}
          </div>
        </div>

        {/* Children nodes */}
        {node.children && node.children.length > 0 && (
          <div className="border-l-2 border-slate-300 ml-4 pl-2 space-y-2">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* High-visibility Warning Banner if mismatch detected */}
      {lineage.has_mismatch && (
        <div className="p-4 rounded-xl bg-rose-600 text-white shadow-lg flex items-start gap-3.5 animate-pulse">
          <AlertOctagon size={24} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold uppercase tracking-wider">
              🔴 SPECIMEN LINEAGE MISMATCH DETECTED
            </h4>
            <p className="text-xs text-rose-100 mt-1 leading-relaxed">
              {lineage.mismatch_details ||
                'One or more evidence streams reference a specimen identifier that is discordant with the registered parent lineage for this case.'}
            </p>
            <p className="text-[11px] font-semibold text-rose-200 mt-2">
              Timeline completion blocked pending manual review and specimen reconciliation.
            </p>
          </div>
        </div>
      )}

      {/* Graph Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GitFork size={16} className="text-sky-600" />
              Specimen Provenance & Downstream Aliquot Tree
            </h3>
            <p className="text-xs text-slate-500">
              Tracing parent specimen collection through diagnostic lab and molecular sequencing tests
            </p>
          </div>
          <Badge variant={lineage.has_mismatch ? 'danger' : 'success'}>
            {lineage.has_mismatch ? 'Lineage Discrepancy' : 'Lineage Validated'}
          </Badge>
        </div>

        <div className="pt-2">
          {lineage.root_specimens.map((root) => renderNode(root))}
        </div>
      </div>
    </div>
  );
};
