import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  size = 'md',
  pulse = false,
  children,
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-[#4ade80] border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    slate: 'bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border-black/10 dark:border-white/10',
    neutral: 'bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border-black/10 dark:border-white/10',
  };

  const dotColors = {
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500 dark:bg-[#4ade80]',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-neutral-400',
    neutral: 'bg-neutral-800 dark:bg-neutral-200',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-mono font-medium rounded-full border select-none tracking-wider uppercase',
          sizeStyles[size],
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColors[variant]
            )}
          />
          <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
