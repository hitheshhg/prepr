import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Map,
  CheckCircle2,
  Circle,
  BookOpen,
  Sparkles,
  Calendar,
  ArrowRight,
  RefreshCw,
  Target,
  Zap,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  PersonalizedRoadmap,
  getLatestRoadmap,
} from '../services/reportService';

export const RoadmapPage: React.FC = () => {
  const [roadmap, setRoadmap] = useState<PersonalizedRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const data = await getLatestRoadmap();
        setRoadmap(data);
      } catch (err) {
        console.error('Failed to load roadmap:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold">Loading Your Roadmap...</h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 font-mono">
          Building a simple 3-step action plan from your interview feedback.
        </p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Card padding="lg">
          <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 border border-[var(--bento-border)] flex items-center justify-center text-[var(--text-main)] mx-auto mb-4">
            <Map className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Roadmap Generated Yet</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
            Complete a mock interview in the Interview Room so our AI can analyze your performance and build your personalized 3-step action plan.
          </p>
          <Link to="/interview">
            <Button variant="primary" size="md" className="font-mono text-xs uppercase tracking-wider">
              Start interview
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const allTasksCount = roadmap.milestones.reduce(
    (acc, m) => acc + m.actionable_tasks.length,
    0
  );
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = allTasksCount > 0 ? Math.round((completedCount / allTasksCount) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner: Clear, Simple Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bento-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>3-Step Action Plan</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Targeted Skill Roadmap
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Simple, bite-sized practice steps tailored to bridge your interview gaps for <strong>{roadmap.target_role}</strong>.
          </p>
        </div>

        <Link to="/interview">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Start new interview
          </Button>
        </Link>
      </div>

      {/* Progress & Target Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 sm:p-5 rounded-2xl bento-card border border-[var(--bento-border)]">
        <div className="sm:col-span-8 space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-500" /> Focus Areas to Elevate
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {roadmap.identified_weak_areas.map((area, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-neutral-500/10 border border-[var(--bento-border)]"
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        <div className="sm:col-span-4 flex flex-col items-end sm:border-l sm:border-[var(--bento-border)] sm:pl-5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono">{progressPct}%</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              ({completedCount}/{allTasksCount} tasks)
            </span>
          </div>
          <div className="w-full bg-neutral-500/10 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Simple Phase Cards */}
      <div className="space-y-4">
        {roadmap.milestones.map((milestone, idx) => {
          const isDone = milestone.actionable_tasks.every(
            (_, tIdx) => !!completedTasks[`${milestone.milestone_id}-t${tIdx}`]
          );

          return (
            <motion.div
              key={milestone.milestone_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bento-card border-[var(--bento-border)]'
              }`}
            >
              {/* Card Header: Phase Step + Title + Time */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                    }`}
                  >
                    {isDone ? '✓' : milestone.step_number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {milestone.title}
                      {isDone && (
                        <span className="text-xs font-mono font-semibold text-emerald-500">
                          (Completed)
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-[var(--text-muted)] font-mono">
                      Target Focus: <span className="text-[var(--text-main)] font-semibold">{milestone.target_skill}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={milestone.difficulty === 'Advanced' ? 'rose' : milestone.difficulty === 'Intermediate' ? 'amber' : 'emerald'} size="sm">
                    {milestone.difficulty}
                  </Badge>
                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> ~{milestone.estimated_days} Days
                  </span>
                </div>
              </div>

              {/* Actionable Checkbox Tasks */}
              <div className="mt-3.5 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                  Action Steps (Click to complete)
                </span>
                <div className="space-y-1.5">
                  {milestone.actionable_tasks.map((task, tIdx) => {
                    const taskId = `${milestone.milestone_id}-t${tIdx}`;
                    const checked = !!completedTasks[taskId];

                    return (
                      <div
                        key={tIdx}
                        onClick={() => toggleTask(taskId)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors text-xs select-none border ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-[var(--text-muted)] line-through'
                            : 'bg-neutral-500/5 hover:bg-neutral-500/10 border-[var(--bento-border)] text-[var(--text-main)]'
                        }`}
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{task}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clean Footer: Key Reference & Goal */}
              <div className="mt-4 pt-3.5 border-t border-[var(--bento-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                {milestone.recommended_resources.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-mono text-[11px]">Recommended:</span>
                    <span className="font-semibold text-[var(--text-main)] truncate max-w-xs">
                      {milestone.recommended_resources[0]}
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  Goal: <span className="italic">{milestone.capstone_mini_project}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA Card */}
      <div className="p-6 rounded-2xl bento-card border border-[var(--bento-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Ready to re-evaluate?
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            After practicing these 3 phases, retake an interview to see your calibrated score rise.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/report">
            <Button variant="secondary" size="sm" className="font-mono text-xs uppercase tracking-wider">
              View latest report
            </Button>
          </Link>
          <Link to="/interview">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
              Practice now <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;
