import React from 'react';
import {
  Network,
  ArrowDown,
  ArrowRight,
  Database,
  Search,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Server
} from 'lucide-react';

export const WorkflowMap: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
            Systems Architecture Comparison
          </span>
          <span className="text-xs text-slate-500 font-mono">Workflow Engineering</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 mt-1">
          Current Fragmented Workflow vs CardioEvidence Proposed Pipeline
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Comparing the high-friction manual search across disconnected diagnostic silos with the
          unified automated ingestion, validation, and role-based review pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CURRENT WORKFLOW */}
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-rose-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">
                Legacy Hospital Practice
              </span>
              <h3 className="text-base font-bold text-slate-900">Current Siloed Workflow</h3>
            </div>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
              ~15–20 Mins / Case
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {/* 3 Silos */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 font-mono block">Vendor A</span>
                <strong className="text-slate-800 text-[11px] block mt-0.5">Pathology LIMS</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 font-mono block">Vendor B</span>
                <strong className="text-slate-800 text-[11px] block mt-0.5">Imaging PACS</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 font-mono block">Vendor C</span>
                <strong className="text-slate-800 text-[11px] block mt-0.5">NGS Portal</strong>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown size={18} />
            </div>

            {/* Step 1 */}
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900">
              <strong className="block font-bold mb-0.5">1. Disconnected Systems Search</strong>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Clinicians must separately log into 3 distinct software applications, each with
                divergent login credentials, search queries, and display layouts.
              </p>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown size={18} />
            </div>

            {/* Step 2 */}
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900">
              <strong className="block font-bold mb-0.5">2. Manual Chronology Assembly</strong>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Physician or nurse manually writes down dates, troponin levels, and echo findings on
                paper or Word documents. High risk of transcribing stale or outdated records.
              </p>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown size={18} />
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800">
              <strong className="block font-bold mb-0.5">3. Multidisciplinary Case Review</strong>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Review panel meets without certainty whether genetic or imaging evidence is missing or
                discordant.
              </p>
            </div>
          </div>
        </div>

        {/* PROPOSED WORKFLOW */}
        <div className="bg-white rounded-2xl border border-sky-300 p-6 shadow-sm space-y-4 ring-1 ring-sky-200">
          <div className="border-b border-sky-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 block">
                CardioEvidence Solution
              </span>
              <h3 className="text-base font-bold text-slate-900">Proposed Unified Pipeline</h3>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              &lt;5 Mins / Case
            </span>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            {/* Pipeline Steps */}
            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-[11px]">
                1
              </div>
              <div>
                <strong className="text-slate-900 block">Multi-Vendor Diagnostic Ingestion</strong>
                <span className="text-[11px] text-slate-600">
                  HL7 FHIR, DICOM, and molecular vcf streamed via unified ingestion gateway
                </span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-[11px]">
                2
              </div>
              <div>
                <strong className="text-slate-900 block">Data Normalization</strong>
                <span className="text-[11px] text-slate-600">
                  Maps heterogeneous vendor nomenclature into standard diagnostic ontology
                </span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-[11px]">
                3
              </div>
              <div>
                <strong className="text-slate-900 block">Quality & Lineage Validation</strong>
                <span className="text-[11px] text-slate-600">
                  Automated checks for duplicate events, stale data, and specimen lineage errors
                </span>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-[11px]">
                4
              </div>
              <div>
                <strong className="text-slate-900 block">Evidence Linking & Unified Timeline</strong>
                <span className="text-[11px] text-slate-600">
                  Associates evidence to patient case with single-pane chronological visualization
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                5
              </div>
              <div>
                <strong className="text-emerald-950 block">Role-Based Review & Consensus Decision</strong>
                <span className="text-[11px] text-emerald-800">
                  Cardiologist, Pathologist, and Geneticist review unified stream with audit sign-off
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
