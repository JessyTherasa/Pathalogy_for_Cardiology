import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowRight,
  FolderKanban,
  FileCheck2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { CaseItem } from '../types';
import { getCases } from '../services/api';
import { useRole } from '../context/RoleContext';
import { FreshnessDot } from '../components/common/FreshnessDot';
import { Badge } from '../components/common/Badge';

interface CaseListProps {
  onSelectCase: (caseId: string) => void;
}

export const CaseList: React.FC<CaseListProps> = ({ onSelectCase }) => {
  const { currentRole } = useRole();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedConsent, setSelectedConsent] = useState('All');

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await getCases(
        {
          search,
          status: selectedStatus,
          risk: selectedRisk,
          consent: selectedConsent
        },
        currentRole
      );
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [search, selectedStatus, selectedRisk, selectedConsent, currentRole]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                Patient Case Registry
              </span>
              <span className="text-xs text-slate-500 font-mono">{cases.length} Total Cases</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Cardiology Multidisciplinary Case Registry
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Browse complete cohort cases with real-time evidence health indicators across
              pathology, imaging, and molecular diagnostic modalities.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID or synthetic patient ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-slate-300 p-2 bg-white text-slate-800 text-xs"
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
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="rounded-md border border-slate-300 p-2 bg-white text-slate-800 text-xs"
          >
            <option value="All">All Risks</option>
            <option value="Low">Low Risk</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>

        <div>
          <select
            value={selectedConsent}
            onChange={(e) => setSelectedConsent(e.target.value)}
            className="rounded-md border border-slate-300 p-2 bg-white text-slate-800 text-xs"
          >
            <option value="All">All Consent</option>
            <option value="Granted">Granted</option>
            <option value="Restricted">Restricted</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No cases found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Case ID</th>
                  <th className="py-3 px-3">Case Status</th>
                  <th className="py-3 px-3">Risk</th>
                  <th className="py-3 px-3">Consent</th>
                  <th className="py-3 px-3 text-center">Pathology</th>
                  <th className="py-3 px-3 text-center">Imaging</th>
                  <th className="py-3 px-3 text-center">Molecular</th>
                  <th className="py-3 px-3 text-center">Evidence Health</th>
                  <th className="py-3 px-3">Completeness</th>
                  <th className="py-3 px-3">Review Status</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
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
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{c.risk_level}</td>
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
                    <td className="py-2.5 px-3 text-center">
                      <FreshnessDot freshness={c.pathology.freshness} />
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {c.pathology.present ? `${c.pathology.count} tests` : 'None'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <FreshnessDot freshness={c.imaging.freshness} />
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {c.imaging.present ? `${c.imaging.count} studies` : 'None'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <FreshnessDot freshness={c.molecular.freshness} />
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {c.molecular.present ? `${c.molecular.count} panels` : 'None'}
                      </span>
                    </td>
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
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{c.completeness_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-medium text-slate-600">
                        {c.review_status}
                      </span>
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
                        <span>Open Workspace</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
