import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = '' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-help ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
    >
      <Info className="w-3.5 h-3.5" />
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/15 text-[11px] leading-snug text-neutral-800 dark:text-neutral-200 shadow-2xl backdrop-blur-md pointer-events-none text-center font-mono">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
