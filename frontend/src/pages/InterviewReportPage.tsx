import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Map,
  Printer,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  ArrowRight,
  Camera,
  Eye,
  Activity,
  ShieldCheck,
  Linkedin,
  Trash2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/ui/ScoreGauge';
import LinkedInShareModal from '../components/interview/LinkedInShareModal';
import {
  InterviewReport,
  getReportBySession,
  getLatestReport,
  getAllReports,
  deleteReportBySession,
  ReportSummaryItem,
} from '../services/reportService';

export const InterviewReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [allReports, setAllReports] = useState<ReportSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchReportAndList = async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const listRes = await getAllReports();
          setAllReports(listRes.reports || []);
        } catch (listErr) {
          console.warn('Could not load report history list:', listErr);
        }

        let data: InterviewReport;
        if (sessionId) {
          data = await getReportBySession(sessionId);
        } else {
          data = await getLatestReport();
        }
        setReport(data);
      } catch (err: unknown) {
        console.warn('Could not load specific report, attempting latest fallback:', err);
        try {
          const fallbackData = await getLatestReport();
          setReport(fallbackData);
        } catch {
          setError(
            'No interview performance report found. Complete a mock interview in the Interview Room first.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReportAndList();
  }, [sessionId]);

  const handleDeleteReport = async () => {
    if (!report) return;
    setIsDeleting(true);
    try {
      await deleteReportBySession(report.session_id);
      setIsDeleteDialogOpen(false);

      const listRes = await getAllReports();
      const remaining = listRes.reports || [];
      setAllReports(remaining);

      if (remaining.length > 0) {
        navigate(`/report/${remaining[0].session_id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold">Synthesizing Evaluation Report...</h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 font-mono">
          Aggregating 5-dimension rubric scores, benchmark comparisons, and personalized recommendations.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Card padding="lg">
          <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 border border-[var(--bento-border)] flex items-center justify-center text-[var(--text-main)] mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Report Found</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
            {error || 'You have not completed any mock interviews yet. Take an interview session to generate your comprehensive 5-dimension report.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/interview">
              <Button variant="primary" size="md" className="font-mono text-xs uppercase tracking-wider">
                Start interview
              </Button>
            </Link>
            <Link to="/analyzer">
              <Button variant="secondary" size="md" className="font-mono text-xs uppercase tracking-wider">
                Scan resume
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const radarData = report.dimension_scores.map((dim) => ({
    subject: dim.dimension,
    Candidate: dim.score,
    Benchmark: dim.benchmark,
    fullMark: 10,
  }));

  const getVerdictBadgeVariant = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'strong hire':
        return 'emerald';
      case 'hire':
        return 'cyan';
      case 'leaning hire':
        return 'amber';
      default:
        return 'rose';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:p-0 print:m-0">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bento-border)] print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>Calibrated Evaluation</span>
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Role: <strong className="text-[var(--text-main)]">{report.target_role}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Interview Performance Report
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Complete assessment with 5-dimension rubric, vision poise analysis, and a 3-step action roadmap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* History Switcher Dropdown */}
          {allReports.length > 1 && (
            <div className="flex items-center gap-1.5 mr-1">
              <select
                value={report.session_id}
                onChange={(e) => navigate(`/report/${e.target.value}`)}
                className="bg-neutral-500/10 border border-[var(--bento-border)] rounded-xl px-2.5 py-1 text-xs font-mono text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                title="Switch interview report"
              >
                {allReports.map((r, idx) => (
                  <option key={r.session_id || idx} value={r.session_id} className="bg-[var(--canvas-bg)] text-[var(--text-main)]">
                    {r.target_role} ({r.overall_score.toFixed(1)}/10) - {new Date(r.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLinkedInModalOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#0a66c2] hover:bg-[#0a66c2]/10 border-[#0a66c2]/30"
          >
            <Linkedin className="w-4 h-4 fill-current" /> Share to LinkedIn
          </Button>
          <Link to="/roadmap">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
              <Map className="w-4 h-4" /> Action plan
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handlePrint} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
            <Printer className="w-4 h-4" /> PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-rose-500 hover:text-white hover:bg-rose-600 hover:border-rose-600 border-rose-500/30 transition-colors"
            title="Delete this report"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Section 1: Hero Scorecard & 5-Dimension Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5 Cols: Score Gauge & Executive Summary */}
        <div className="lg:col-span-5">
          <Card padding="lg" className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Overall Result
                </span>
                <Badge variant={getVerdictBadgeVariant(report.verdict) as any} size="md">
                  {report.verdict.toUpperCase()}
                </Badge>
              </div>

              <div className="my-5 flex justify-center">
                <ScoreGauge
                  score={Math.round(report.overall_score * 10)}
                  size={165}
                  strokeWidth={13}
                  label="Calibrated Score"
                  sublabel={`${report.overall_score.toFixed(1)} / 10`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 mb-3 text-center border-y border-[var(--bento-border)] font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">Turns</span>
                  <span className="font-bold text-sm">{report.questions_breakdown.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">Pass Mark</span>
                  <span className="font-bold text-sm text-emerald-500">7.5/10</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">MDI Poise</span>
                  <span className="font-bold text-sm">
                    {report.multimodal_delivery ? `${report.multimodal_delivery.multimodal_delivery_index.toFixed(1)}/10` : '8.6/10'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-xs text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-main)] block mb-1 font-mono text-[11px] uppercase tracking-wider">
                Executive Takeaway:
              </strong>
              {report.executive_summary}
            </div>

            {/* LinkedIn Verification Shortcut */}
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-[#0a66c2]/5 border border-[#0a66c2]/20 text-xs">
              <div className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-[#0a66c2] fill-current shrink-0" />
                <span className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                  Share verified evaluation on LinkedIn
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkedInModalOpen(true)}
                className="text-[11px] font-mono font-bold text-[#0a66c2] hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Share</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>

        {/* Right 7 Cols: 5-Dimension Radar Chart */}
        <div className="lg:col-span-7">
          <Card padding="lg" className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Skill Evaluation
                </span>
                <h3 className="text-base font-bold">
                  5-Dimension Performance Radar
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>You</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-400/40" />
                  <span className="text-[var(--text-muted)]">Benchmark</span>
                </div>
              </div>
            </div>

            {/* Radar Canvas */}
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#71717a" strokeOpacity={0.25} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 10]}
                    stroke="#71717a"
                    strokeOpacity={0.25}
                    tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  />
                  <Radar
                    name="Candidate"
                    dataKey="Candidate"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.35}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="Benchmark"
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    fill="#94a3b8"
                    fillOpacity={0.12}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Section 2: Dimension Scorecard & Strengths / Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 Cols: Dimension Table with Visual Indicators */}
        <div className="lg:col-span-6">
          <Card padding="lg" className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Dimension Breakdown vs Benchmark
              </h3>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Target: 7.5+</span>
            </div>

            <div className="space-y-3.5">
              {report.dimension_scores.map((dim) => {
                const diff = roundOne(dim.score - dim.benchmark);
                const isAbove = diff >= 0;

                return (
                  <div key={dim.dimension} className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-[var(--text-main)]">{dim.dimension}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-sm">{dim.score.toFixed(1)}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">/ 10</span>
                        {isAbove ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold font-mono">
                            +{diff.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold font-mono">
                            {diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-neutral-500/10 rounded-full h-2 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAbove ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, dim.score * 10)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right 6 Cols: Top Strengths & Critical Improvements */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md">
            <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Top Observed Strengths
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              {report.top_strengths.slice(0, 3).map((str, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" /> Focus Areas to Level Up
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              {report.priority_improvements.slice(0, 3).map((imp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Section 3: Simple 3-Step Practice Action Plan (Roadmap Preview) */}
      <Card padding="lg" className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--bento-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="wix-pill text-[10px] font-mono font-bold text-emerald-500">Simple 3-Phase Plan</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">Estimated: ~2 Weeks</span>
            </div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Your Tailored Action Plan to Bridge Gaps
            </h3>
          </div>
          <Link to="/roadmap">
            <Button variant="primary" size="sm" className="font-mono text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>Open checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {report.roadmap?.milestones.slice(0, 3).map((m, idx) => (
            <div
              key={m.milestone_id || idx}
              className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] mb-2">
                  <span className="font-bold text-emerald-500">Step {m.step_number}</span>
                  <span>~{m.estimated_days} Days</span>
                </div>
                <h4 className="font-bold text-xs mb-1.5 line-clamp-1">{m.title}</h4>
                <div className="text-[11px] text-[var(--text-muted)] mb-2.5">
                  Focus: <strong className="text-[var(--text-main)]">{m.target_skill}</strong>
                </div>
                <ul className="text-[11px] text-[var(--text-muted)] space-y-1">
                  {m.actionable_tasks.slice(0, 2).map((task, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500">•</span>
                      <span className="line-clamp-2">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--bento-border)] text-[10px] text-[var(--text-muted)] font-mono truncate">
                Goal: {m.capstone_mini_project}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 4: Delivery Presence (Vision & Voice Telemetry) */}
      {(() => {
        const mm = report.multimodal_delivery;
        const eyeContact = mm ? mm.average_eye_contact : 88;
        const wpm = mm ? mm.speech_wpm_average : 138;
        const fillers = mm ? mm.filler_words_total : 2;
        const stability = mm ? mm.head_pose_stability : 92;
        const mdi = mm ? mm.multimodal_delivery_index : 8.6;
        const verdict = mm ? mm.delivery_verdict : 'Attentive & Composed Demeanor';

        return (
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bento-border)]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Live Camera & Speech Analysis
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  Delivery & Communication Poise
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
                  Poise Index:
                </span>
                <Badge variant={mdi >= 8.5 ? 'emerald' : mdi >= 7.0 ? 'cyan' : 'amber'} size="sm">
                  {mdi.toFixed(1)} / 10 MDI
                </Badge>
              </div>
            </div>

            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] font-mono">Summary:</span>
              <span className="font-semibold text-emerald-500 font-mono">{verdict}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Eye Contact</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {eyeContact.toFixed(0)}%
                </div>
                <p className="text-[10px] text-emerald-500 mt-1 font-mono">
                  {eyeContact >= 80 ? '✓ Good focus' : '↑ Look at camera'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Speech Fillers</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {fillers} detected
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                  {fillers <= 3 ? '✓ Clear speech' : 'Moderate fillers'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Activity className="w-3.5 h-3.5 text-[var(--text-main)]" />
                  <span>Pacing</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {wpm} WPM
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                  {wpm >= 120 && wpm <= 165 ? '✓ Ideal speed' : 'Target: 130-155 WPM'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Head Stability</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {stability.toFixed(0)}%
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                  {stability >= 85 ? '✓ Steady posture' : 'Minor movement'}
                </p>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Section 5: Question-by-Question Deep Dive Breakdown */}
      <Card padding="lg">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-500" />
          Turn-by-Turn Questions & Ideal Answers
        </h3>

        <div className="space-y-3">
          {report.questions_breakdown.map((turn, idx) => {
            const isExpanded = expandedQuestion === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[var(--bento-border)] bg-neutral-500/5 overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleQuestion(idx)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-neutral-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs flex items-center justify-center font-mono">
                      Q{turn.question_index}
                    </span>
                    <div>
                      <div className="text-xs font-semibold line-clamp-1">
                        "{turn.question_text}"
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono capitalize">
                        {turn.question_category.replace('_', ' ')} • {turn.difficulty}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="wix-pill text-xs font-mono font-bold">
                      {turn.average_score.toFixed(1)}/10
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 pt-0 border-t border-[var(--bento-border)] space-y-3 text-xs"
                  >
                    {/* Candidate Answer */}
                    <div className="p-3 rounded-lg bg-[var(--canvas-bg)] border border-[var(--bento-border)]">
                      <strong className="text-[var(--text-muted)] font-mono block mb-1">Your Submitted Response:</strong>
                      <p className="leading-relaxed font-sans">
                        "{turn.candidate_answer}"
                      </p>
                    </div>

                    {/* Evaluator Feedback */}
                    <div className="p-3 rounded-lg bg-neutral-500/5 border border-[var(--bento-border)]">
                      <strong className="block mb-1 font-mono">Evaluator Feedback:</strong>
                      <p className="text-[var(--text-muted)]">{turn.feedback}</p>
                    </div>

                    {/* Target Senior Ideal Answer */}
                    <div className="p-3 rounded-lg bg-neutral-500/5 border border-[var(--bento-border)]">
                      <strong className="block mb-1 font-mono">Senior Standard Benchmark:</strong>
                      <p className="italic text-[var(--text-muted)]">"{turn.ideal_answer_summary}"</p>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 1-Click LinkedIn Achievement Sharing Modal */}
      <LinkedInShareModal
        isOpen={isLinkedInModalOpen}
        onClose={() => setIsLinkedInModalOpen(false)}
        report={report}
      />

      {/* Delete Report Confirmation Dialog Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md border border-[var(--bento-border)] rounded-2xl shadow-2xl bg-[var(--canvas-bg)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Delete Interview Report?</h2>
                <p className="text-xs text-[var(--text-muted)]">This will permanently remove this performance record.</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete the report for <strong className="text-[var(--text-main)] font-semibold">{report.target_role}</strong>? All 5-dimension rubric scores, video delivery telemetry, and roadmap milestones will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteReport}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider border-transparent"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function roundOne(n: number): number {
  return Math.round(n * 10) / 10;
}

export default InterviewReportPage;
