import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, Download, RefreshCw } from 'lucide-react';
import { AuditLogItem } from '../types';
import { getAuditLogs } from '../services/api';
import { useRole } from '../context/RoleContext';
import { Badge } from '../components/common/Badge';

export const AuditTrail: React.FC = () => {
  const { currentRole } = useRole();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedResult, setSelectedResult] = useState('All');
  const [actionSearch, setActionSearch] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(
        {
          user_role: selectedRole,
          result: selectedResult,
          action: actionSearch
        },
        currentRole
      );
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedRole, selectedResult, actionSearch, currentRole]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                Governance & Compliance
              </span>
              <span className="text-xs text-slate-500 font-mono">Immutable Audit Trail</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              System-Wide Clinical Activity & Security Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Real-time chronological log recording every case inspection, evidence drill-down,
              restricted consent blocked access, review decision commit, and failure scenario injection.
            </p>
          </div>

          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Log</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Filter Action</label>
          <input
            type="text"
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            placeholder="e.g. Case Opened, Failure, Ingestion..."
            className="w-full text-xs rounded-md border border-slate-300 p-1.5 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">User Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
          >
            <option value="All">All Roles</option>
            <option value="Cardiologist">Cardiologist</option>
            <option value="Pathologist">Pathologist</option>
            <option value="Molecular Specialist">Molecular Specialist</option>
            <option value="Reviewer">Reviewer</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Outcome</label>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-300 p-1.5 bg-white text-slate-800"
          >
            <option value="All">All Results</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="WARNING">WARNING</option>
            <option value="DETECTED">DETECTED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Audit Events ({logs.length} Logged)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">SQLite Stored</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No audit records match filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Timestamp</th>
                  <th className="py-3 px-3">User Role</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Resource</th>
                  <th className="py-3 px-3">Result</th>
                  <th className="py-3 px-3">Case ID</th>
                  <th className="py-3 px-3">Details / Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{log.user_role}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {log.resource}
                    </td>
                    <td className="py-2.5 px-3">
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
                    <td className="py-2.5 px-3 font-mono text-[11px] text-sky-700">
                      {log.case_id || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-sm truncate">
                      {log.details || '—'}
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
