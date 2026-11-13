import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Zap,
  TrendingUp,
  Volume2,
  VolumeX,
  FileText,
  Code,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/ui/ScoreGauge';
import AIOrb, { AIOrbState } from '../components/interview/AIOrb';
import MinimalistLoadingVisual from '../components/interview/MinimalistLoadingVisual';
import WebcamVisionTracker from '../components/interview/WebcamVisionTracker';
import LiveCodeSandbox from '../components/interview/LiveCodeSandbox';
import { useDeliveryAnalytics } from '../hooks/useDeliveryAnalytics';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import {
  startInterview,
  submitAnswer,
  endInterview,
  QuestionItem,
  AnswerEvaluation,
  SessionSummary,
} from '../services/interviewService';

const PRESET_ROLES = [
  'Full Stack Developer',
  'Backend Python Engineer',
  'Frontend React Engineer',
  'AI / Machine Learning Engineer',
  'DevOps & Cloud Engineer',
  'System Design & Distributed Systems',
];

const SAMPLE_ANSWERS: Record<string, string> = {
  project_deep_dive:
    'In my major project, prepr, I architected a full-stack AI interview platform using FastAPI and React. I implemented Google Gemini structured JSON mode with multi-tier fallback chains to achieve zero failed evaluations. On the database layer, I used Motor async MongoDB Atlas with compound indexes, maintaining sub-50ms query latencies. I engineered the interview state machine to dynamically adapt difficulty based on rolling answer scores.',
  technical:
    'In FastAPI, asynchronous endpoints run directly on the single-threaded asyncio event loop. When awaiting non-blocking operations like database queries or external API calls, execution yields control back to the event loop to handle concurrent connections. For CPU-intensive operations, we offload processing to thread pools using run_in_threadpool or background Celery task queues to prevent event loop starvation.',
  system_design:
    'To design a high-throughput distributed rate limiter, I would utilize Redis with the Token Bucket algorithm. Using Redis Lua scripts ensures atomic execution of token refills and decrements without race conditions across multiple application server instances. A sliding window counter tracks per-tenant limits with sub-millisecond overhead and graceful degradation if Redis fails.',
  behavioral:
    'In a previous team project, we had a strong disagreement regarding whether to use SQL or NoSQL for our primary datastore. Rather than debating opinions, I created a reproducible benchmark measuring latency and serialization overhead for 5,000 synthetic payloads. The data clearly demonstrated 40% faster writes with MongoDB, allowing the team to align objectively on evidence and ship on time.',
  situational:
    'If a production service starts throwing 500 errors after deployment and rollback fails, my first priority is incident containment. I check APM dashboards and error logs to isolate the failing component, divert traffic via Cloudflare or our load balancer to a static maintenance fallback, and disable recent feature flags before applying an emergency hotfix.',
  default:
    'I approach technical problems by first decomposing requirements, identifying potential bottlenecks and edge cases, and evaluating trade-offs between latency, maintainability, and architectural complexity.',
};

export const InterviewRoomPage: React.FC = () => {
  // Session configuration & state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [customRole, setCustomRole] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [initialDifficulty, setInitialDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('medium');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);

  // Candidate interaction
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Feedback & History
  const [latestEvaluation, setLatestEvaluation] = useState<AnswerEvaluation | null>(null);
  const [turnHistory, setTurnHistory] = useState<
    Array<{
      question: QuestionItem;
      answerText: string;
      evaluation: AnswerEvaluation;
    }>
  >([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'camera' | 'scorecard'>('camera');
  const [showCodeSandbox, setShowCodeSandbox] = useState(false);

  // Speech Hooks
  const {
    isSpeaking,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

  const handleSpeechFinal = useCallback((finalTranscript: string) => {
    setAnswerText(finalTranscript);
  }, []);

  const {
    isListening,
    interimTranscript,
    isSupported: isSttSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: sttError,
  } = useSpeechRecognition({
    onFinalTranscript: handleSpeechFinal,
    enableBargeIn: true,
  });

  // Multimodal Vision & Delivery Analytics
  const { metrics: deliveryMetrics, recordEyeContact, updatePosture } = useDeliveryAnalytics(
    answerText + ' ' + (interimTranscript || ''),
    timerSeconds
  );

  const feedbackRef = useRef<HTMLDivElement>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOrbState = (): AIOrbState => {
    if (submitting) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  };

  useEffect(() => {
    if (currentQuestion && sessionActive) {
      speak(currentQuestion.question_text);
    }
  }, [currentQuestion, sessionActive, speak]);

  // Start interview session
  const handleStartSession = async () => {
    setStarting(true);
    setErrorMessage(null);
    try {
      const role = customRole.trim() || targetRole;
      const resp = await startInterview({
        target_role: role,
        total_questions: totalQuestions,
        initial_difficulty: initialDifficulty,
      });

      setSessionId(resp.session_id);
      setCurrentQuestion(resp.first_question);
      setCurrentQuestionIndex(resp.first_question.question_index);
      setCurrentDifficulty(initialDifficulty);
      setSessionActive(true);
      setIsTimerRunning(true);
      setTimerSeconds(0);
      setTurnHistory([]);
      setLatestEvaluation(null);
      setSessionSummary(null);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } } };
      console.error('Session start failed:', err);
      setErrorMessage(errorResponse.response?.data?.detail || 'Failed to start interview. Ensure backend server is healthy.');
    } finally {
      setStarting(false);
    }
  };

  // Submit answer handler
  const handleSubmitAnswer = async () => {
    stopListening();
    stopSpeaking();

    const fullAnswer = (answerText + (interimTranscript ? ' ' + interimTranscript : '')).trim();

    if (!sessionId || !currentQuestion || fullAnswer.length < 5) {
      setErrorMessage('Please provide a substantive answer (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const resp = await submitAnswer(sessionId, {
        answer_text: fullAnswer,
        duration_seconds: timerSeconds,
        eye_contact_score: deliveryMetrics.eyeContactScore,
        posture_status: deliveryMetrics.postureStatus,
        wpm: deliveryMetrics.wpm,
        filler_count: deliveryMetrics.fillerCount,
      });

      const completedTurn = {
        question: currentQuestion,
        answerText: fullAnswer,
        evaluation: resp.evaluation,
      };
      setTurnHistory((prev) => [...prev, completedTurn]);
      setLatestEvaluation(resp.evaluation);
      setCurrentDifficulty(resp.current_difficulty);

      if (resp.is_complete || !resp.next_question) {
        setIsTimerRunning(false);
        const summary = await endInterview(sessionId);
        setSessionSummary(summary);
        setSessionActive(false);
      } else {
        setCurrentQuestion(resp.next_question);
        setCurrentQuestionIndex(resp.next_question.question_index);
        setAnswerText('');
        resetTranscript();
        setTimerSeconds(0);
      }

      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } } };
      console.error('Turn submission failed:', err);
      setErrorMessage(errorResponse.response?.data?.detail || 'Evaluation failed. Please try submitting again.');
    } finally {
      setSubmitting(false);
    }
  };

  // End interview early
  const handleEndEarly = async () => {
    if (!sessionId) return;
    if (window.confirm('Are you sure you want to end this mock interview session?')) {
      try {
        stopListening();
        stopSpeaking();
        setIsTimerRunning(false);
        const summary = await endInterview(sessionId);
        setSessionSummary(summary);
        setSessionActive(false);
      } catch (err) {
        console.error('Failed to end interview:', err);
      }
    }
  };

  const handleFillSample = () => {
    stopListening();
    const category = currentQuestion?.question_category || 'default';
    const sample = SAMPLE_ANSWERS[category] || SAMPLE_ANSWERS.default;
    setAnswerText(sample);
  };

  const handleToggleVoiceRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleAppendCodeToAnswer = (codeSnippet: string) => {
    setAnswerText((prev) => (prev ? prev.trim() + '\n\n' + codeSnippet : codeSnippet));
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'emerald';
      case 'hard':
        return 'rose';
      default:
        return 'cyan';
    }
  };

  return (
    <div className="w-full py-2 space-y-4">
      {/* =========================================================================
          VIEW 1: SETUP SCREEN
         ========================================================================= */}
      {!sessionActive && !sessionSummary && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-2xl mx-auto"
        >
          {starting ? (
            <Card padding="lg" className="py-16 text-center">
              <MinimalistLoadingVisual
                mode="connecting"
                title="Initializing Interview Room"
                subtitle={`Setting up adaptive questions for ${customRole || targetRole}...`}
              />
            </Card>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex wix-pill text-[10px] mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Voice AI Studio
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Start interview
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                  Adaptive technical mock session calibrated to your target engineering role.
                </p>
              </div>

              <Card padding="lg" className="space-y-5">
                {/* Target Role Selector */}
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Target Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {PRESET_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setTargetRole(role);
                          setCustomRole('');
                        }}
                        className={`text-left p-3 rounded-xl border font-mono text-xs transition-colors ${
                          targetRole === role && !customRole
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white font-bold'
                            : 'bg-neutral-500/5 text-[var(--text-main)] border-[var(--bento-border)] hover:bg-neutral-500/10'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Or type custom role (e.g. Staff Distributed Systems Engineer)..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] text-xs text-[var(--text-main)] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 font-sans"
                  />
                </div>

                {/* Question Count & Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Questions Count
                    </label>
                    <div className="flex gap-2">
                      {[3, 5, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTotalQuestions(num)}
                          className={`flex-1 py-2 rounded-xl border font-mono text-xs transition-colors ${
                            totalQuestions === num
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white font-bold'
                              : 'bg-neutral-500/5 text-[var(--text-main)] border-[var(--bento-border)] hover:bg-neutral-500/10'
                          }`}
                        >
                          {num} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Starting Difficulty
                    </label>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setInitialDifficulty(diff)}
                          className={`flex-1 py-2 rounded-xl border font-mono text-xs capitalize transition-colors ${
                            initialDifficulty === diff
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white font-bold'
                              : 'bg-neutral-500/5 text-[var(--text-main)] border-[var(--bento-border)] hover:bg-neutral-500/10'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartSession}
                  className="w-full font-mono text-xs uppercase tracking-wider py-3"
                  icon={<Zap className="w-4 h-4" />}
                >
                  Enter Interview Studio
                </Button>
              </Card>
            </>
          )}
        </motion.div>
      )}

      {/* =========================================================================
          VIEW 2: ACTIVE DUAL-STAGE INTERVIEW ROOM
         ========================================================================= */}
      {sessionActive && currentQuestion && (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Top Session Progress Bar */}
          <div className="bento-card px-4 py-2.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="wix-pill text-xs font-mono font-bold">
                Q {currentQuestionIndex} / {totalQuestions}
              </span>
              <Badge variant={getDifficultyColor(currentDifficulty)} size="sm">
                {currentDifficulty.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={handleEndEarly}
                className="text-xs font-mono text-[var(--text-muted)] hover:text-rose-500 px-2 py-1 rounded-lg transition-colors"
                title="End interview early"
              >
                End
              </button>
            </div>
          </div>

          {/* Dual Stage: AI Interviewer (Left) & Candidate Stage (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Stage Tile: AI Interviewer */}
            <div className="bento-card h-[360px] rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
              {/* Top Row: AI Status & Subtle Replay */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    AI Interviewer
                  </span>
                  <Badge variant="neutral" size="sm">
                    {currentQuestion.question_category.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speak(currentQuestion.question_text);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-neutral-500/10 hover:bg-neutral-500/20 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  title={isSpeaking ? 'Stop voice' : 'Replay question audio'}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Center: Minimalist Evaluating Waveform OR Living AI Orb */}
              <AnimatePresence mode="wait">
                {submitting ? (
                  <motion.div
                    key="evaluating"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <MinimalistLoadingVisual
                      mode="evaluating"
                      title="Calibrating Evaluation"
                      subtitle="Benchmarking against L5 rubric standards..."
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="orb"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col items-center justify-center py-1"
                  >
                    <AIOrb
                      state={getOrbState()}
                      size={74}
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        } else {
                          speak(currentQuestion.question_text);
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom: Question Text with AnimatePresence */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.question_id || currentQuestionIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]"
                >
                  <h3 className="text-sm sm:text-base font-medium leading-relaxed">
                    "{currentQuestion.question_text}"
                  </h3>
                  {currentQuestion.context_note && (
                    <div className="mt-1.5 pt-1.5 border-t border-[var(--bento-border)] flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
                      <Sparkles className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{currentQuestion.context_note}</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Stage Tile: Candidate Camera HUD / Feedback Scorecard */}
            <div className="bento-card h-[360px] rounded-2xl relative overflow-hidden flex flex-col" ref={feedbackRef}>
              {latestEvaluation && (
                <div className="absolute top-2.5 right-12 z-20">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab(rightPanelTab === 'camera' ? 'scorecard' : 'camera')}
                    className="px-2.5 py-1 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black border border-white/20 text-[10px] font-mono flex items-center gap-1.5 transition-all shadow-md"
                    title={rightPanelTab === 'camera' ? 'View last rubric evaluation' : 'View live camera feed'}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {rightPanelTab === 'camera'
                      ? `Score: ${latestEvaluation.average_score.toFixed(1)}/10 ▾`
                      : 'Back to Camera'}
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {rightPanelTab === 'camera' || !latestEvaluation ? (
                  <motion.div
                    key="camera"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex-1 min-h-0"
                  >
                    <WebcamVisionTracker
                      isActive={sessionActive}
                      deliveryMetrics={deliveryMetrics}
                      onRecordEyeContact={recordEyeContact}
                      onUpdatePosture={updatePosture}
                      className="h-full border-0 rounded-none shadow-none bg-transparent"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="scorecard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-y-auto p-4 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--bento-border)]">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                          Turn {turnHistory.length} Rubric
                        </div>
                        <div className="text-sm font-bold">Evaluation Breakdown</div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono">
                          {latestEvaluation.average_score.toFixed(1)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-mono"> / 10</span>
                      </div>
                    </div>

                    {/* 5 Rubric Bars */}
                    <div className="space-y-2">
                      {[
                        { label: 'Relevance', score: latestEvaluation.scores.relevance },
                        { label: 'Technical Accuracy', score: latestEvaluation.scores.technical_accuracy },
                        { label: 'Clarity & Structure', score: latestEvaluation.scores.clarity },
                        { label: 'Technical Depth', score: latestEvaluation.scores.depth },
                        { label: 'Confidence', score: latestEvaluation.scores.confidence },
                      ].map((rubric) => (
                        <div key={rubric.label}>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-[var(--text-muted)]">{rubric.label}</span>
                            <span className="font-mono font-bold">{rubric.score}/10</span>
                          </div>
                          <div className="w-full bg-neutral-500/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-neutral-900 dark:bg-white"
                              style={{ width: `${(rubric.score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                      <strong className="text-[var(--text-main)] block mb-0.5">Evaluator Notes:</strong>
                      {latestEvaluation.feedback}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Response Console: Bento Capsule */}
          <Card padding="md">
            <div className="space-y-2">
              <div className="relative rounded-2xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] focus-within:border-neutral-500 transition-colors p-2.5 flex items-start gap-3">
                {/* Glowing Mic Toggle */}
                <button
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  disabled={!isSttSupported}
                  className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all ${
                    !isSttSupported
                      ? 'opacity-40 cursor-not-allowed bg-neutral-500/10 text-[var(--text-muted)]'
                      : isListening
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                      : 'bg-neutral-500/10 hover:bg-neutral-500/20 text-[var(--text-main)] border border-[var(--bento-border)]'
                  }`}
                  title={
                    !isSttSupported
                      ? 'Voice mode not supported in this browser (please use Chrome or Edge)'
                      : isListening
                      ? 'Stop recording'
                      : 'Click to answer via voice (speech automatically interrupts AI)'
                  }
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Textarea / Voice Stream */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Listening... words will stream here as you speak.'
                        : 'Click mic to speak, or type your technical response here...'
                    }
                    rows={2}
                    className="w-full bg-transparent text-[var(--text-main)] placeholder-neutral-400 text-sm focus:outline-none leading-relaxed resize-none font-sans"
                  />

                  {interimTranscript && (
                    <div className="text-emerald-500 text-xs italic flex items-center gap-1.5 pt-0.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      "{interimTranscript}"
                    </div>
                  )}
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-1.5 self-end">
                  <button
                    type="button"
                    onClick={() => setShowCodeSandbox((prev) => !prev)}
                    className={`p-2 rounded-xl transition-colors ${
                      showCodeSandbox
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10'
                    }`}
                    title={showCodeSandbox ? 'Hide Code Sandbox' : 'Open Live Code Execution Sandbox'}
                  >
                    <Code className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10 transition-colors"
                    title="Fill sample answer"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitAnswer}
                    disabled={submitting || (answerText.trim().length + (interimTranscript?.length || 0)) < 5}
                    className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status footer: Word count & Mic state */}
              <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Microphone active (barge-in enabled)
                    </span>
                  )}
                  {!isSttSupported && (
                    <span className="text-[var(--text-muted)]">
                      Voice input optimized for Chromium • Keyboard active
                    </span>
                  )}
                  {sttError && <span className="text-amber-500">{sttError}</span>}
                </div>

                <span>
                  {answerText.trim() ? answerText.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              {/* In-Interview Live Code Execution Sandbox Drawer */}
              <LiveCodeSandbox
                isOpen={showCodeSandbox}
                onClose={() => setShowCodeSandbox(false)}
                onAppendToAnswer={handleAppendCodeToAnswer}
              />
            </div>

            {errorMessage && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errorMessage}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: INTERVIEW COMPLETION SUMMARY
         ========================================================================= */}
      {sessionSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <Card padding="lg" className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Award className="w-7 h-7" />
            </div>

            <Badge variant="emerald" pulse className="mb-2">
              Mock Interview Completed
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Performance Evaluation Report
            </h2>
            <p className="text-[var(--text-muted)] text-xs sm:text-sm max-w-md mx-auto mt-1">
              You completed all {sessionSummary.completed_turns} questions for the position of{' '}
              <strong className="text-[var(--text-main)]">{sessionSummary.target_role}</strong>.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-8">
              <ScoreGauge
                score={Math.round(sessionSummary.overall_average_score * 10)}
                size={140}
                strokeWidth={12}
                label="Overall"
                sublabel="Score %"
              />

              <div className="text-left space-y-2 font-mono text-xs">
                <div className="text-[var(--text-muted)]">
                  Difficulty Reached:{' '}
                  <span className="font-semibold text-[var(--text-main)] capitalize">
                    {sessionSummary.difficulty_progression.slice(-1)[0]}
                  </span>
                </div>
                <div className="text-[var(--text-muted)]">
                  Questions Answered:{' '}
                  <span className="font-semibold text-[var(--text-main)]">
                    {sessionSummary.completed_turns} of {sessionSummary.total_questions}
                  </span>
                </div>
                <div className="text-[var(--text-muted)]">
                  Recommendation:{' '}
                  <span className="font-semibold text-emerald-500">
                    {sessionSummary.overall_average_score >= 7.5
                      ? 'Strong Hire Profile'
                      : sessionSummary.overall_average_score >= 6.0
                      ? 'Hire Profile (Minor Gaps)'
                      : 'Needs Foundational Review'}
                  </span>
                </div>
              </div>
            </div>

            {/* Multimodal Delivery Summary */}
            <div className="mt-6 pt-6 border-t border-[var(--bento-border)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">Direct Eye Contact</span>
                <span className="text-xl font-bold font-mono mt-1 block">
                  {deliveryMetrics.eyeContactScore}%
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">Camera engagement</span>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">Speech Fillers</span>
                <span className="text-xl font-bold font-mono mt-1 block">
                  {deliveryMetrics.fillerCount} detected
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 capitalize">
                  Rating: {deliveryMetrics.fillerRating}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">Speaking Pace</span>
                <span className="text-xl font-bold font-mono mt-1 block">
                  {deliveryMetrics.wpm > 0 ? `${deliveryMetrics.wpm} WPM` : '135 WPM'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 capitalize">
                  Cadence: {deliveryMetrics.pacingStatus}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--bento-border)] flex flex-wrap items-center justify-center gap-3">
              <Link to={`/report/${sessionSummary.session_id}`}>
                <Button
                  variant="primary"
                  className="font-mono text-xs uppercase tracking-wider flex items-center gap-1.5"
                  icon={<FileText className="w-4 h-4" />}
                >
                  View In-Depth Report & Roadmap
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  setSessionSummary(null);
                  setSessionActive(false);
                }}
                className="font-mono text-xs uppercase tracking-wider"
              >
                New interview
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = '/analyzer';
                }}
                className="font-mono text-xs uppercase tracking-wider"
              >
                Scan resume
              </Button>
            </div>
          </Card>

          {/* Turn History Breakdown */}
          {turnHistory.length > 0 && (
            <Card padding="lg">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Question-by-Question Breakdown
              </h3>
              <div className="space-y-3">
                {turnHistory.map((turn, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        Q{idx + 1}: {turn.question.question_category.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="wix-pill text-[11px] font-mono font-bold">
                        Score: {turn.evaluation.average_score.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="text-[var(--text-muted)] italic">"{turn.question.question_text}"</p>
                    <p className="text-[var(--text-main)] font-sans leading-relaxed">{turn.evaluation.feedback}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default InterviewRoomPage;
