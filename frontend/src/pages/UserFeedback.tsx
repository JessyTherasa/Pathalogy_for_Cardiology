import React, { useState, useEffect } from 'react';
import {
  MessageSquareHeart,
  Star,
  Clock,
  CheckCircle2,
  Users,
  Send,
  PlusCircle,
  ThumbsUp
} from 'lucide-react';
import { UserFeedbackItem, FeedbackMetrics } from '../types';
import { getFeedback, getFeedbackMetrics, submitFeedbackApi } from '../services/api';
import { useRole } from '../context/RoleContext';
import { Badge } from '../components/common/Badge';

export const UserFeedback: React.FC = () => {
  const { currentRole } = useRole();
  const [feedbackList, setFeedbackList] = useState<UserFeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [taskCompleted, setTaskCompleted] = useState('Reviewed CASE-1001 and verified timeline');
  const [timeTaken, setTimeTaken] = useState('180');
  const [easeOfUse, setEaseOfUse] = useState(5);
  const [timelineClarity, setTimelineClarity] = useState(5);
  const [completenessConfidence, setCompletenessConfidence] = useState(5);
  const [comments, setComments] = useState('');
  const [suggestedImprovements, setSuggestedImprovements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([
        getFeedback(currentRole),
        getFeedbackMetrics(currentRole)
      ]);
      setFeedbackList(list);
      setMetrics(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedbackApi(
        {
          user_role: currentRole,
          task_completed: taskCompleted,
          time_taken_seconds: parseFloat(timeTaken) || 180,
          ease_of_use: easeOfUse,
          timeline_clarity: timelineClarity,
          completeness_confidence: completenessConfidence,
          comments: comments || undefined,
          suggested_improvements: suggestedImprovements || undefined
        },
        currentRole
      );

      setComments('');
      setSuggestedImprovements('');
      setSubmittedMessage(true);
      setTimeout(() => setSubmittedMessage(false), 3000);
      await loadData();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
            Stakeholder Experience & Usability Survey
          </span>
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
            Prototype Validation Data
          </span>
        </div>
        <h2 className="text-xl font-black text-slate-900 mt-1">
          Clinical Multidisciplinary User Validation
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Collecting structured qualitative and quantitative usability feedback from cardiologists,
          pathologists, and genetic specialists evaluating the CardioEvidence interface.
        </p>
      </div>

      {/* Aggregate Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Evaluators & Testers
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {metrics?.total_responses ?? '—'}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Clinical specialists</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Average Ease of Use
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-700">
              {metrics?.avg_ease_of_use ?? '5.0'}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">/ 5.0</span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">High interface satisfaction</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
            Timeline Clarity
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-2xl font-black text-sky-700">
              {metrics?.avg_timeline_clarity ?? '5.0'}
            </span>
            <span className="text-xs text-sky-600 font-semibold">/ 5.0</span>
          </div>
          <span className="text-[11px] text-sky-600 mt-0.5 block">Clear chronologic synthesis</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
            Completeness Confidence
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-2xl font-black text-purple-700">
              {metrics?.avg_completeness_confidence ?? '5.0'}
            </span>
            <span className="text-xs text-purple-600 font-semibold">/ 5.0</span>
          </div>
          <span className="text-[11px] text-purple-600 mt-0.5 block">Confidence in no missed labs</span>
        </div>
      </div>

      {/* Main Grid: Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Send size={14} className="text-sky-600" />
              Submit Evaluation Feedback
            </h3>
            <span className="text-[11px] text-slate-500">Record your prototype test impression</span>
          </div>

          {submittedMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 size={15} /> Thank you! Feedback recorded to database.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Evaluating Role</label>
              <div className="p-2 bg-slate-100 rounded-md text-slate-800 font-semibold">
                {currentRole}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinical Task Evaluated *</label>
              <input
                type="text"
                value={taskCompleted}
                onChange={(e) => setTaskCompleted(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Time Taken to Complete (Seconds)
              </label>
              <input
                type="number"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ease of Use (1 to 5) : {easeOfUse}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={easeOfUse}
                onChange={(e) => setEaseOfUse(parseInt(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Timeline Clarity (1 to 5) : {timelineClarity}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={timelineClarity}
                onChange={(e) => setTimelineClarity(parseInt(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Completeness Confidence (1 to 5) : {completenessConfidence}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={completenessConfidence}
                onChange={(e) => setCompletenessConfidence(parseInt(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Qualitative Comments</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Observed benefits, UI strengths..."
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Suggested Improvements</label>
              <textarea
                value={suggestedImprovements}
                onChange={(e) => setSuggestedImprovements(e.target.value)}
                rows={2}
                placeholder="Features to add in production..."
                className="w-full rounded-md border border-slate-300 p-2 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Validation Rating'}
            </button>
          </form>
        </div>

        {/* Feedback Responses Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Evaluator Submissions ({feedbackList.length})
            </h3>
            <span className="text-[11px] text-slate-500">Persisted in SQLite</span>
          </div>

          <div className="space-y-3">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.user_role}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">{item.task_completed}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                  <span>Ease: <strong className="text-emerald-700">{item.ease_of_use}/5</strong></span>
                  <span>•</span>
                  <span>Clarity: <strong className="text-sky-700">{item.timeline_clarity}/5</strong></span>
                  <span>•</span>
                  <span>Confidence: <strong className="text-purple-700">{item.completeness_confidence}/5</strong></span>
                  <span>•</span>
                  <span>Time: <strong className="font-mono text-slate-800">{item.time_taken_seconds}s</strong></span>
                </div>

                {item.comments && (
                  <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">
                    "{item.comments}"
                  </p>
                )}

                {item.suggested_improvements && (
                  <div className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">Recommendation:</strong>{' '}
                    {item.suggested_improvements}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
