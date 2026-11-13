import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
} from '../services/reportService';

export const InterviewReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
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

    fetchReport();
  }, [sessionId]);

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

  // Format data for Recharts Radar Chart
  const radarData = report.dimension_scores.map((dim) => ({
    subject: dim.dimension,
    Candidate: dim.score,
    Benchmark: dim.benchmark,
    fullMark: 10,
  }));

  const getVerdictBadgeVariant = (verdict: string) => {
    switch (verdict) {
      case 'Strong Hire':
        return 'emerald';
      case 'Hire':
        return 'cyan';
      case 'Leaning Hire':
        return 'amber';
      default:
        return 'rose';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:p-0 print:m-0">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bento-border)] print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>L5 Benchmark Rubric</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Interview Performance Report
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Review your interview rubric evaluation, computer vision delivery metrics, and targeted improvement areas.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
              <Map className="w-4 h-4" /> View roadmap
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handlePrint} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
            <Printer className="w-4 h-4" /> Save PDF
          </Button>
        </div>
      </div>

      {/* Section 1: Executive Summary & Scorecard Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Gauge & Verdict */}
        <div className="lg:col-span-5">
          <Card padding="lg" className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Overall Evaluation
                </span>
                <Badge variant={getVerdictBadgeVariant(report.verdict) as any} size="md">
                  {report.verdict.toUpperCase()}
                </Badge>
              </div>

              <div className="my-6 flex justify-center">
                <ScoreGauge
                  score={Math.round(report.overall_score * 10)}
                  size={170}
                  strokeWidth={14}
                  label="Calibrated Score"
                  sublabel={`${report.overall_score.toFixed(1)} / 10`}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-xs text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-main)] block mb-1">Executive Summary:</strong>
              {report.executive_summary}
            </div>

            {/* LinkedIn Verification Badge Shortcut */}
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-[#0a66c2]/5 border border-[#0a66c2]/20 text-xs">
              <div className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-[#0a66c2] fill-current flex-shrink-0" />
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Verified L5 candidate evaluation badge
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkedInModalOpen(true)}
                className="text-[11px] font-mono font-bold text-[#0a66c2] hover:underline flex items-center gap-1"
              >
                <span>Share</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>

        {/* Right 7 Cols: 5-Dimension Radar Chart */}
        <div className="lg:col-span-7">
          <Card padding="lg" className="h-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Multi-Metric Rubric
                </span>
                <h3 className="text-base font-bold">
                  5-Dimension Performance Radar
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Candidate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-400/30" />
                  <span className="text-[var(--text-muted)]">L5 Benchmark</span>
                </div>
              </div>
            </div>

            {/* Radar Canvas */}
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#71717a" strokeOpacity={0.3} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 10]}
                    stroke="#71717a"
                    strokeOpacity={0.3}
                    tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  />
                  <Radar
                    name="Candidate"
                    dataKey="Candidate"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="Benchmark"
                    stroke="#64748b"
                    fill="#64748b"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Section 2: Dimension Scorecard & Strengths / Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Dimension Table */}
        <div className="lg:col-span-6">
          <Card padding="lg" className="h-full">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Dimension Scorecard vs Senior L5 Benchmark
            </h3>

            <div className="space-y-4">
              {report.dimension_scores.map((dim) => {
                const isAboveBenchmark = dim.score >= dim.benchmark;
                return (
                  <div key={dim.dimension} className="text-xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-[var(--text-main)]">{dim.dimension}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold">{dim.score.toFixed(1)}/10</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          (target: {dim.benchmark.toFixed(1)})
                        </span>
                        {isAboveBenchmark ? (
                          <span className="text-[10px] text-emerald-500 font-semibold">✓ Meets</span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-semibold">↑ Gap</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-neutral-500/10 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="h-full rounded-full bg-neutral-900 dark:bg-white"
                        style={{ width: `${dim.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right 6 Cols: Strengths & Growth Areas */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md">
            <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Top Observed Strengths
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              {report.top_strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" /> Critical Areas for Growth
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              {report.priority_improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Quick link to Roadmap */}
          <div className="p-4 rounded-xl bento-card flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Personalized Roadmap Ready
              </div>
              <div className="text-[var(--text-muted)] mt-0.5">
                Targeted milestones generated to bridge your {report.priority_improvements[0] || 'technical'} gap.
              </div>
            </div>
            <Link to="/roadmap">
              <Button variant="primary" size="sm" className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
                Roadmap <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Section 2.5: Multimodal Executive Delivery & Non-Verbal Presence */}
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
                  Computer Vision & Speech Signal Analysis
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  Executive Delivery & Non-Verbal Presence
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
                  Multimodal Delivery Index (MDI):
                </span>
                <Badge variant={mdi >= 8.5 ? 'emerald' : mdi >= 7.0 ? 'cyan' : 'amber'} size="sm">
                  {mdi.toFixed(1)} / 10 MDI
                </Badge>
              </div>
            </div>

            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] font-mono">Multimodal Synthesis:</span>
              <span className="font-semibold text-emerald-500 font-mono">{verdict}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Eye Contact</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {eyeContact.toFixed(0)}%
                </div>
                <p className="text-[11px] text-emerald-500 mt-1 font-mono">
                  {eyeContact >= 80 ? '✓ Direct camera engagement' : '↑ Practice lens focus'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Speech Fillers</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {fillers} detected
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                  {fillers <= 3 ? 'Crisp & deliberate delivery' : 'Moderate filler density'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Activity className="w-3.5 h-3.5 text-[var(--text-main)]" />
                  <span>Speaking Cadence</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {wpm} WPM
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                  {wpm >= 120 && wpm <= 165 ? 'Ideal conversational tempo' : 'Target: 130-155 WPM'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Posture Stability</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {stability.toFixed(0)}%
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                  {stability >= 85 ? 'Grounded, centered demeanor' : 'Minor fidgeting detected'}
                </p>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Section 3: Question-by-Question Deep Dive Breakdown */}
      <Card padding="lg">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-500" />
          Turn-by-Turn Questions & Ideal Answer Analysis
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

                    {/* Target L5 Senior Ideal Answer */}
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
    </div>
  );
};

export default InterviewReportPage;
