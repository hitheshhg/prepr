import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface ScoreGaugeProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 180,
  strokeWidth = 14,
  label = 'ATS Score',
  sublabel = 'Match Rate',
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    let start = 0;
    const duration = 1200; // ms
    const stepTime = 16;
    const increment = (score / duration) * stepTime;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // Color logic based on score tier
  const getGradientId = () => {
    if (score >= 80) return 'gauge-emerald';
    if (score >= 60) return 'gauge-cyan';
    return 'gauge-amber';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-600 dark:text-[#4ade80]';
    if (score >= 60) return 'text-cyan-600 dark:text-cyan-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gauge-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="gauge-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="gauge-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-black/[0.08] dark:text-white/[0.08]"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${getGradientId()})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      {/* Central Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
        <span className={`text-4xl font-extrabold tracking-tight ${getScoreColor()}`}>
          {animatedScore}
          <span className="text-xl font-normal text-neutral-400 dark:text-neutral-500">%</span>
        </span>
        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{label}</span>
        {sublabel && <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{sublabel}</span>}
      </div>
    </div>
  );
};

export default ScoreGauge;
