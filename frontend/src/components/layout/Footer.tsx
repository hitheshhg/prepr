import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Github } from 'lucide-react';
import { playClick } from '../../lib/sound';

export const Footer: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const istTime = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setTime(istTime);
      } catch {
        setTime('IST');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    playClick(900, 0.03);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer aria-label="Footer" className="w-full mt-4">
      <div className="bento-card p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        {/* Brand, Status & Live Clock */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <Link
            to="/dashboard"
            onClick={() => playClick(600, 0.02)}
            className="text-xs sm:text-sm font-semibold tracking-tight text-neutral-900 dark:text-white hover:opacity-80 transition-opacity flex items-center justify-center sm:justify-start gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white inline-block" />
            <span>InterviewIQ</span>
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">•</span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#4ade80] animate-pulse" />
            <span>BLR {time ? `${time} IST` : 'IST'}</span>
          </span>
          <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">•</span>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Shreya • VTU Major Project
          </p>
        </div>

        {/* Links & Back to Top */}
        <div className="flex items-center gap-3 text-xs">
          <a
            href="https://github.com/hitheshhg/InterviewIQ"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClick(600, 0.02)}
            aria-label="GitHub Repository"
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 transition-all ml-1"
            title="Scroll to top"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
