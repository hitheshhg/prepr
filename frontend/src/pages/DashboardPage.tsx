import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  TrendingUp,
  FileText,
  Sparkles,
  Zap,
  RefreshCw,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InfoTooltip from '../components/common/InfoTooltip';
import { useAuth } from '../context/AuthContext';
import {
  DashboardMetrics,
  getDashboardMetrics,
  deleteReportBySession,
  clearAllHistory,
} from '../services/reportService';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const firstName = (
    currentUser?.displayName ||
    userProfile?.display_name ||
    'Candidate'
  ).split(' ')[0];

  const handleDeleteSingleSession = async () => {
    if (!sessionToDelete) return;
    setIsActionLoading(true);
    try {
      await deleteReportBySession(sessionToDelete);
      setSessionToDelete(null);
      // Re-fetch metrics to refresh cards and lists cleanly
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Could not delete session. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearAllHistory = async () => {
    setIsActionLoading(true);
    try {
      await clearAllHistory();
      setIsClearAllDialogOpen(false);
      // Re-fetch metrics (will be empty)
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to clear all history:', err);
      alert('Could not clear history. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
          Loading metrics...
        </p>
      </div>
    );
  }

  const hasSessions = (metrics?.total_interviews_completed ?? 0) > 0;
  const trendData = metrics?.score_trend || [];
  const recentSessions = (metrics?.recent_sessions || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner: Greeting + Primary Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bento-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>Candidate Portal</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Track your interview readiness, ATS scores, and performance metrics.
          </p>
        </div>

        <Link to="/interview">
          <Button variant="primary" size="md" className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Start interview
          </Button>
        </Link>
      </div>

      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Sessions taken */}
        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              Sessions
              <InfoTooltip text="Total mock interview sessions completed." />
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-500/10 flex items-center justify-center text-[var(--text-main)]">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
            {metrics?.total_interviews_completed ?? 0}
          </div>
        </Card>

        {/* KPI 2: Average score */}
        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              Avg score
              <InfoTooltip text="Aggregated performance score out of 10." />
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-500/10 flex items-center justify-center text-[var(--text-main)]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
            {metrics?.average_interview_score ? metrics.average_interview_score.toFixed(1) : '-'}
            <span className="text-xs text-[var(--text-muted)] font-normal"> / 10</span>
          </div>
        </Card>

        {/* KPI 3: Best score */}
        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              Best score
              <InfoTooltip text="Highest recorded mock interview score." />
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
            {metrics?.highest_interview_score ? metrics.highest_interview_score.toFixed(1) : '-'}
            <span className="text-xs text-[var(--text-muted)] font-normal"> / 10</span>
          </div>
        </Card>

        {/* KPI 4: Latest ATS score */}
        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              Latest ATS
              <InfoTooltip text="Most recent resume match percentage." />
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-500/10 flex items-center justify-center text-[var(--text-main)]">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
            {metrics?.latest_ats_score !== null && metrics?.latest_ats_score !== undefined
              ? `${metrics.latest_ats_score}%`
              : '-'}
          </div>
        </Card>
      </div>

      {/* Conditional Rendering: Empty State for New Users vs Full Analytics */}
      {!hasSessions ? (
        <Card padding="lg" className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 border border-[var(--bento-border)] flex items-center justify-center text-[var(--text-main)] mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ready for your first interview?</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">
            Practice realistic voice roleplay questions and receive instant AI feedback.
          </p>
          <Link to="/interview">
            <Button variant="primary" size="md" className="font-mono text-xs uppercase tracking-wider">
              Start interview
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Score Trend Chart */}
          {trendData.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold">Score progression</h2>
                  <p className="text-xs text-[var(--text-muted)]">Performance evolution over completed sessions</p>
                </div>
                <span className="wix-pill text-[10px]">
                  Score vs Sessions
                </span>
              </div>

              <div className="w-full h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      stroke="#71717a"
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bento-bg)',
                        borderColor: 'var(--bento-border)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxShadow: 'var(--bento-shadow)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scoreGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3 px-2">
              <div>
                <h2 className="text-sm font-bold">Recent sessions</h2>
                <p className="text-xs text-[var(--text-muted)]">Review past performance logs</p>
              </div>
              <div className="flex items-center gap-3">
                {recentSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearAllDialogOpen(true)}
                    className="text-xs text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 font-mono transition-colors"
                    title="Clear all interview history"
                  >
                    <Trash2 className="w-3 h-3" /> Clear history
                  </button>
                )}
                <Link to="/interview" className="text-xs font-mono font-medium hover:underline flex items-center gap-1">
                  New interview <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-[var(--bento-border)] text-xs">
              {recentSessions.map((s, idx) => (
                <div
                  key={idx}
                  className="py-3 px-2 flex items-center justify-between hover:bg-neutral-500/5 rounded-xl transition-colors"
                >
                  <div>
                    <p className="font-semibold">{s.target_role}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      {s.total_questions} questions • {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="wix-pill text-xs font-mono font-bold">
                      {s.overall_score ? s.overall_score.toFixed(1) : '7.5'}/10
                    </span>
                    <Link to={`/report/${s.session_id}`}>
                      <Button variant="secondary" size="sm" className="text-xs py-1 px-2.5 font-mono">
                        View report
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSessionToDelete(s.session_id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete this session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Delete Single Session Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md border border-[var(--bento-border)] rounded-2xl shadow-2xl bg-[var(--canvas-bg)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Delete Interview Session?</h2>
                <p className="text-xs text-[var(--text-muted)]">This will remove this session and its report permanently.</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete this session? All question responses and calibrated scores will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSessionToDelete(null)}
                disabled={isActionLoading}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteSingleSession}
                disabled={isActionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider border-transparent"
              >
                {isActionLoading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Modal */}
      {isClearAllDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md border border-[var(--bento-border)] rounded-2xl shadow-2xl bg-[var(--canvas-bg)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Clear All History?</h2>
                <p className="text-xs text-[var(--text-muted)]">Reset all mock interview records and reports.</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to clear your entire interview preparation history? All past session logs, rubric evaluations, and generated roadmaps will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsClearAllDialogOpen(false)}
                disabled={isActionLoading}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleClearAllHistory}
                disabled={isActionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider border-transparent"
              >
                {isActionLoading ? 'Clearing...' : 'Clear All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
