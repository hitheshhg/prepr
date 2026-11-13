import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Map,
  CheckCircle2,
  Circle,
  BookOpen,
  Code,
  Calendar,
  ArrowRight,
  RefreshCw,
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
        <h2 className="text-xl font-bold">Synthesizing Milestone Roadmap...</h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 font-mono">
          Generating step-by-step curriculum targeting your lowest scoring interview dimensions.
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
            Complete a mock interview in the Interview Room so our AI can analyze your knowledge gaps and build a personalized progression roadmap.
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
    <div className="w-full max-w-6xl mx-auto space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bento-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>Career Curriculum</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Personalized Career Roadmap
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Curated milestones and proof-of-skill tasks targeting detected technical gaps.
          </p>
        </div>

        <Link to="/interview">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
            Start interview <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Progress & Target Focus Card */}
      <Card padding="lg">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-8 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Target Improvement Focus
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {roadmap.identified_weak_areas.map((area, idx) => (
                <span
                  key={idx}
                  className="wix-pill text-xs font-mono font-semibold"
                >
                  {area}
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] pt-1">
              Curated sequentially to elevate your interview scores from candidate level to Senior L5 benchmark.
            </p>
          </div>

          <div className="sm:col-span-4 p-4 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-center">
            <div className="text-3xl font-black font-mono">{progressPct}%</div>
            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">Roadmap Completion</div>
            <div className="w-full bg-neutral-500/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-neutral-900 dark:bg-white h-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1.5">
              {completedCount} of {allTasksCount} tasks completed
            </div>
          </div>
        </div>
      </Card>

      {/* Vertical Milestones Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--bento-border)]">
        {roadmap.milestones.map((milestone, idx) => {
          const isAdvanced = milestone.difficulty === 'Advanced';
          return (
            <motion.div
              key={milestone.milestone_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative"
            >
              {/* Step indicator circle on line */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black border-2 border-[var(--canvas-bg)] flex items-center justify-center text-xs font-bold font-mono shadow-sm">
                {milestone.step_number}
              </div>

              {/* Milestone Card */}
              <Card padding="lg">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="wix-pill text-[10px]">
                      Step {milestone.step_number}
                    </span>
                    <Badge variant={isAdvanced ? 'rose' : 'cyan'} size="sm">
                      {milestone.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>~{milestone.estimated_days} Days</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold mb-1">
                  {milestone.title}
                </h3>
                <div className="text-xs text-[var(--text-muted)] font-mono mb-4">
                  Target Competency: <span className="text-[var(--text-main)] font-semibold">{milestone.target_skill}</span>
                </div>

                {/* Actionable Tasks Checklist */}
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Actionable Learning Tasks
                  </div>
                  <div className="space-y-1.5">
                    {milestone.actionable_tasks.map((task, tIdx) => {
                      const taskId = `${milestone.milestone_id}-t${tIdx}`;
                      const isDone = !!completedTasks[taskId];
                      return (
                        <div
                          key={tIdx}
                          onClick={() => toggleTask(taskId)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors text-xs select-none border ${
                            isDone
                              ? 'bg-neutral-500/5 border-transparent text-[var(--text-muted)] line-through'
                              : 'bg-neutral-500/5 hover:bg-neutral-500/10 border-[var(--bento-border)] text-[var(--text-main)]'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommended Resources & Capstone Project Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--bento-border)] text-xs">
                  {/* Resources */}
                  <div className="p-3 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 font-mono">
                      <BookOpen className="w-3.5 h-3.5" /> Curated References
                    </div>
                    <ul className="list-disc list-inside text-[var(--text-muted)] space-y-0.5">
                      {milestone.recommended_resources.map((res, rIdx) => (
                        <li key={rIdx} className="truncate">
                          {res}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Capstone Mini Project */}
                  <div className="p-3 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 font-mono">
                      <Code className="w-3.5 h-3.5" /> Proof-of-Skill Capstone
                    </div>
                    <p className="text-[var(--text-muted)] leading-relaxed">
                      {milestone.capstone_mini_project}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapPage;
