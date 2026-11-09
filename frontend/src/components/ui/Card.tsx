import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverEffect?: boolean;
  glow?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  hoverEffect = false,
  glow = 'none',
  padding = 'md',
  className,
  children,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-5',
    md: 'p-5 sm:p-7',
    lg: 'p-6 sm:p-9',
  };

  const glowStyles = {
    none: '',
    cyan: 'border-cyan-500/30 dark:border-cyan-400/25 shadow-[0_4px_24px_rgba(6,182,212,0.08)]',
    violet: 'border-violet-500/30 dark:border-violet-400/25 shadow-[0_4px_24px_rgba(139,92,246,0.08)]',
    emerald: 'border-emerald-500/30 dark:border-emerald-400/25 shadow-[0_4px_24px_rgba(16,185,129,0.08)]',
    amber: 'border-amber-500/30 dark:border-amber-400/25 shadow-[0_4px_24px_rgba(245,158,11,0.08)]',
  };

  return (
    <motion.div
      className={twMerge(
        clsx(
          'bento-card relative overflow-hidden transition-all duration-300',
          hoverEffect && 'hover:scale-[1.005] hover:shadow-xl',
          glowStyles[glow],
          paddingStyles[padding],
          className
        )
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
