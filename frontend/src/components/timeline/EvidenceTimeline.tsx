import React, { useState } from 'react';
import {
  ArrowDownUp,
  Filter,
  Eye,
  Calendar,
  Layers,
  AlertTriangle,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { EvidenceEventItem } from '../../types';
import { ModalityIcon } from '../common/ModalityIcon';
import { FreshnessDot } from '../common/FreshnessDot';
import { Badge } from '../common/Badge';

interface EvidenceTimelineProps {
  events: EvidenceEventItem[];
  reviews?: any[];
  onSelectEvent: (eventId: string) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSort: () => void;
  selectedModality: string;
  onSelectModality: (mod: string) => void;
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  events,
  reviews = [],
  onSelectEvent,
  sortOrder,
  onToggleSort,
  selectedModality,
  onSelectModality
}) => {
  const modalities = ['All', 'Pathology', 'Imaging', 'Molecular'];

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-sky-600" /> Filter Modality:
          </span>
          <div className="flex items-center gap-1.5">
            {modalities.map((mod) => (
              <button
                key={mod}
                onClick={() => onSelectModality(mod)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedModality === mod
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onToggleSort}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
        >
          <ArrowDownUp size={13} />
          <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
        </button>
      </div>

      {/* Timeline Stream */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-sm font-medium">No diagnostic evidence recorded for this case filter.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-sky-200 ml-4 pl-6 space-y-6 py-2">
          {events.map((ev, index) => {
            const isAbnormal =
              ev.interpretation.toLowerCase().includes('abnormal') ||
              ev.interpretation.toLowerCase().includes('pathogenic') ||
              ev.interpretation.toLowerCase().includes('elevated');

            const hasWarning =
              ev.validation_status !== 'Valid' || ev.freshness === 'Very Stale';

            return (
              <div key={ev.id || index} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] top-1.5 h-6 w-6 rounded-full bg-white border-2 border-sky-600 flex items-center justify-center shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-sky-600" />
                </div>

                <div
                  className={`bg-white rounded-xl border transition-all p-4 shadow-sm hover:shadow-md ${
                    hasWarning
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {/* Event Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <ModalityIcon modality={ev.modality} size={16} />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                          {ev.modality} • {ev.vendor}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{ev.test_name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FreshnessDot freshness={ev.freshness} showLabel />
                      {ev.validation_status !== 'Valid' && (
                        <Badge variant="danger">{ev.validation_status}</Badge>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(ev.event_timestamp).toLocaleString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Result & Interpretation Body */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                        Result Summary
                      </div>
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        {ev.result_summary}
                      </p>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            isAbnormal
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Status: {ev.interpretation}
                        </span>

                        {ev.specimen_id && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                            Specimen: {ev.specimen_id}
                          </span>
                        )}

                        <span className="text-slate-400 text-[11px]">
                          Source: {ev.source_system}
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectEvent(ev.event_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs"
                      >
                        <Eye size={13} />
                        <span>View Evidence</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
