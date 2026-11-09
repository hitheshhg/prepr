import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { playClick } from '../../lib/sound';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-mono font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-tight';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm active:scale-[0.98]',
    secondary:
      'bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-[0.98]',
    glass:
      'bg-black/[0.03] dark:bg-white/[0.04] text-neutral-900 dark:text-white border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 backdrop-blur-sm',
    outline:
      'bg-transparent text-neutral-800 dark:text-neutral-200 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white',
    ghost:
      'bg-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      playClick(750, 0.02);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      disabled={disabled || loading}
      onClick={handleClick}
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default Button;
