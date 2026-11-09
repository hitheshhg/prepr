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
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InfoTooltip from '../components/common/InfoTooltip';
import { useAuth } from '../context/AuthContext';
import {
  DashboardMetrics,
  getDashboardMetrics,
} from '../services/reportService';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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
          <div className="flex items-center gap-2 mb-1">
            <span className="wix-pill text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Candidate Portal
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
              <Link to="/interview" className="text-xs font-mono font-medium hover:underline flex items-center gap-1">
                New interview <ArrowRight className="w-3 h-3" />
              </Link>
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

                  <div className="flex items-center gap-3">
                    <span className="wix-pill text-xs font-mono font-bold">
                      {s.overall_score ? s.overall_score.toFixed(1) : '7.5'}/10
                    </span>
                    <Link to={`/report/${s.session_id}`}>
                      <Button variant="secondary" size="sm" className="text-xs py-1 px-2.5 font-mono">
                        View report
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
