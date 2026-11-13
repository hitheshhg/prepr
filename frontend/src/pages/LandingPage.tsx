import React from 'react';
import { Navigate } from 'react-router-dom';
import { FileCheck, Mic, Map } from 'lucide-react';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { currentUser, loading } = useAuth();

  // If already logged in, redirect immediately to dashboard
  if (currentUser && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-6 sm:py-8 bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors duration-200 select-none">
      {/* Top Bento Header */}
      <header className="w-full max-w-6xl sm:max-w-7xl bento-card px-5 sm:px-8 py-3.5 rounded-2xl flex items-center justify-between relative z-40 overflow-visible">
        <div className="flex items-center gap-3">
          <img
            src="/logo-square.png"
            alt="Prepr Logo"
            className="w-9 h-9 object-contain rounded-xl p-0.5 bg-neutral-900/5 dark:bg-white/10 shadow-sm shrink-0"
          />
          <span className="text-base sm:text-lg font-extrabold tracking-tight">
            pre<span className="text-neutral-500 dark:text-neutral-400">pr</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span>AI Ready</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenAuth('signin')}
            className="text-xs font-mono"
          >
            Sign in
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenAuth('signup')}
            className="text-xs font-mono"
          >
            Sign up
          </Button>
        </div>
      </header>

      {/* Main Hero: Bento Architecture */}
      <main className="relative z-10 max-w-4xl lg:max-w-5xl text-center flex flex-col items-center my-auto py-12 space-y-6 sm:space-y-8">
        {/* Brand Mascot Logo */}
        <div className="relative group">
          <img
            src="/logo.png"
            alt="Prepr AI Interview Platform Mascot"
            className="w-32 sm:w-40 h-auto object-contain mx-auto drop-shadow-xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2.5 py-1.5 px-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <span>REAL-TIME VOICE AI • DETERMINISTIC ATS SCORING</span>
        </div>

        {/* Tagline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
          Get grilled by AI.{' '}
          <span className="text-neutral-500 dark:text-neutral-400 block sm:inline">
            Get hired by humans.
          </span>
        </h1>

        {/* Short explanation */}
        <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-lg leading-relaxed">
          Master technical interviews with real-time AI voice roleplay, deterministic ATS resume scoring, and personalized skill roadmaps.
        </p>

        {/* 3 Bento Feature Micro-Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 pt-1">
          <div className="wix-pill flex items-center gap-2 py-1.5 px-3.5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
            <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono text-xs">Resume score</span>
          </div>

          <div className="wix-pill flex items-center gap-2 py-1.5 px-3.5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
            <Mic className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-mono text-xs">Voice interview</span>
          </div>

          <div className="wix-pill flex items-center gap-2 py-1.5 px-3.5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
            <Map className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-mono text-xs">Career roadmap</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onOpenAuth('signup')}
            className="px-8 font-mono text-xs tracking-wider uppercase"
          >
            Start Practicing
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onOpenAuth('signin')}
            className="px-8 font-mono text-xs tracking-wider uppercase"
          >
            Sign in
          </Button>
        </div>
      </main>

      {/* Bento Footer */}
      <footer className="w-full max-w-6xl sm:max-w-7xl bento-card px-5 sm:px-8 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[var(--text-muted)]">
        <div>prepr • Autonomous Technical Interview Studio</div>
        <div className="flex items-center gap-3">
          <span>BLR IST</span>
          <span>•</span>
          <span>Zero-Telemetry Privacy</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
