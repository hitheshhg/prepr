import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left font-mono">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}

        <div className="relative flex items-center font-sans">
          {leftIcon && (
            <div className="absolute left-3.5 text-neutral-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full py-2.5 px-3.5 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.04] border text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 transition-all duration-200 focus:outline-none focus:border-neutral-900 dark:focus:border-white',
                leftIcon ? 'pl-10' : 'pl-3.5',
                rightIcon ? 'pr-10' : 'pr-3.5',
                error
                  ? 'border-rose-500 focus:border-rose-500 bg-rose-500/[0.03]'
                  : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
              ),
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-neutral-400 pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
