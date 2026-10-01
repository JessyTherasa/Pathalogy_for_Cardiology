import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  RotateCcw,
  RefreshCw,
  Flame,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';
import { getSettings, updateSettings, resetDatabase, regenerateDataset } from '../services/api';
import { useRole } from '../context/RoleContext';

export const Settings: React.FC = () => {
  const { currentRole } = useRole();
  const [currentDays, setCurrentDays] = useState(7);
  const [staleDays, setStaleDays] = useState(30);
  const [veryStaleDays, setVeryStaleDays] = useState(60);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      const data = await getSettings(currentRole);
      if (data.freshness_thresholds) {
        setCurrentDays(data.freshness_thresholds.current_days || 7);
        setStaleDays(data.freshness_thresholds.stale_days || 30);
        setVeryStaleDays(data.freshness_thresholds.very_stale_days || 60);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [currentRole]);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(
        {
          freshness_thresholds: {
            current_days: currentDays,
            stale_days: staleDays,
            very_stale_days: veryStaleDays
          }
        },
        currentRole
      );
      setSuccessMessage('Freshness thresholds updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDb = async () => {
    if (confirm('Reset database to clean default demonstration baseline?')) {
      setLoading(true);
      try {
        await resetDatabase(currentRole);
        setSuccessMessage('Database reset and re-seeded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        alert(`Reset error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegenerateDb = async () => {
    if (confirm('Regenerate entire synthetic dataset (100+ new cases, 500+ events)?')) {
      setLoading(true);
      try {
        await regenerateDataset(currentRole);
        setSuccessMessage('Fresh synthetic cohort regenerated!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        alert(`Regeneration error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
            System Administration
          </span>
          <span className="text-xs text-slate-500 font-mono">Role: {currentRole}</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 mt-1">
          CardioEvidence System Settings & Engine Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Configure clinical freshness rules, required diagnostic streams, and manage the underlying
          synthetic demonstration database.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-medium shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Freshness Thresholds Config Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock size={15} className="text-sky-600" />
              Diagnostic Freshness Engine Thresholds
            </h3>
            <p className="text-xs text-slate-500">
              Days elapsed before diagnostic evidence transitions from Current to Stale and Very Stale
            </p>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Current Threshold (Days)
              </label>
              <input
                type="number"
                value={currentDays}
                onChange={(e) => setCurrentDays(parseInt(e.target.value) || 7)}
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Events &le; {currentDays} days old receive 🟢 Current status
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Stale Threshold (Days)
              </label>
              <input
                type="number"
                value={staleDays}
                onChange={(e) => setStaleDays(parseInt(e.target.value) || 30)}
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Events between {currentDays} and {staleDays} days old receive 🟡 Stale status
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Very Stale Threshold (Days)
              </label>
              <input
                type="number"
                value={veryStaleDays}
                onChange={(e) => setVeryStaleDays(parseInt(e.target.value) || 60)}
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Events &gt; {staleDays} days old receive 🔴 Very Stale status
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Thresholds'}
            </button>
          </form>
        </div>

        {/* Database Lifecycle Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Server size={15} className="text-sky-600" />
              Database Management Controls
            </h3>
            <p className="text-xs text-slate-500">
              Reset cases or re-initialize the baseline clinical database
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <strong className="block font-bold text-slate-800">
                Restore Baseline State
              </strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Restores the standard 10 multidisciplinary cases (CASE-1001 through CASE-1010) and associated diagnostic events.
              </p>
              <button
                onClick={handleResetDb}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <RotateCcw size={13} />
                <span>Reset Database</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <strong className="block font-bold text-slate-800">
                Re-initialize Database
              </strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Re-initializes the database with verified diagnostic modalities and specimen lineage records.
              </p>
              <button
                onClick={handleRegenerateDb}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} />
                <span>Re-initialize Database</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
