import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Mic,
  Award,
  Map,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import ThemeToggle from '../ui/ThemeToggle';
import { playClick } from '../../lib/sound';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navLinks: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Resume ATS', path: '/analyzer', icon: FileText },
  { name: 'Mock Interview', path: '/interview', icon: Mic },
  { name: 'Reports', path: '/report', icon: Award },
  { name: 'Roadmap', path: '/roadmap', icon: Map },
];

export const Navbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    playClick(500, 0.03);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = currentUser?.displayName || userProfile?.display_name || 'Candidate';
  const email = currentUser?.email || userProfile?.email || '';
  const photoURL = currentUser?.photoURL || userProfile?.photo_url || null;
  const firstName = displayName.split(' ')[0] || 'Candidate';

  return (
    <header className="sticky top-2 sm:top-4 z-40 w-full transition-all duration-300">
      <div className="relative rounded-2xl sm:rounded-3xl bg-[var(--bento-bg)]/85 dark:bg-[var(--bento-bg)]/80 backdrop-blur-xl border border-[var(--bento-border)] shadow-lg shadow-black/[0.03] dark:shadow-black/25 p-2 sm:p-2.5 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 overflow-visible">
        
        {/* Left: Brand Identity & Live AI Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link
            to="/dashboard"
            onClick={() => playClick(750, 0.02)}
            className="flex items-center gap-2.5 group select-none transition-transform active:scale-95"
            aria-label="Prepr Home"
          >
            {/* Glossy Icon Container */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 dark:from-white/20 dark:via-white/10 dark:to-white/5 border border-black/10 dark:border-white/15 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <img
                src="/logo-square.png"
                alt="Prepr Logo"
                className="w-5 h-5 object-contain rounded-md"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Wordmark */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                pre<span className="text-neutral-400 dark:text-neutral-500 font-normal">pr</span>
              </span>
              <span className="hidden xl:inline-flex text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-900/5 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 border border-neutral-900/5 dark:border-white/10 font-medium">
                AI Prep
              </span>
            </div>
          </Link>

          {/* Micro AI Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="tracking-tight">AI Engine Ready</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Dock with Animated Sliding Pill */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-0.5 p-1 rounded-xl sm:rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.05] relative text-xs font-mono select-none"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => playClick(700, 0.02)}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs transition-colors duration-150 ${
                  isActive
                    ? 'text-neutral-950 dark:text-white font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 rounded-lg sm:rounded-xl bg-white dark:bg-white/15 shadow-xs border border-black/5 dark:border-white/10 -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick Launch CTA, Theme Toggle, & Candidate Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Mock Practice CTA */}
          <Link
            to="/interview"
            onClick={() => playClick(800, 0.03)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-500 animate-pulse" />
            <span>Practice</span>
          </Link>

          {/* Divider */}
          <div className="hidden sm:block h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Theme Mode Toggle */}
          <ThemeToggle />

          {/* Candidate Profile Avatar & Dropdown */}
          <div className="relative z-50" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                playClick(600, 0.02);
                setDropdownOpen(!dropdownOpen);
              }}
              className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1 pr-1.5 sm:pr-2.5 rounded-full border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-all focus:outline-none"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="User account menu"
            >
              <div className="relative">
                <Avatar src={photoURL} name={displayName} size="sm" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[var(--bento-bg)]" />
              </div>
              <span className="hidden xl:inline-block text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 max-w-[85px] truncate">
                {firstName}
              </span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Glass Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bento-bg)]/95 backdrop-blur-2xl border border-[var(--bento-border)] shadow-2xl p-2 z-50 font-mono text-xs"
                >
                  {/* User Profile Overview */}
                  <div className="px-3 py-2.5 border-b border-[var(--bento-border)] mb-1.5 flex items-center gap-2.5">
                    <Avatar src={photoURL} name={displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900 dark:text-white truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {email || 'Candidate Account'}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Account</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links in Menu */}
                  <div className="space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => {
                        playClick(700, 0.02);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Profile Settings</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </Link>

                    <Link
                      to="/report"
                      onClick={() => {
                        playClick(700, 0.02);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-neutral-400" />
                        <span>My Reports</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </Link>

                    <Link
                      to="/roadmap"
                      onClick={() => {
                        playClick(700, 0.02);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Map className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Career Roadmap</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </Link>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-1.5 mt-1.5 border-t border-[var(--bento-border)]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => {
              playClick(500, 0.02);
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Animated Glass Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden mt-2 rounded-2xl bg-[var(--bento-bg)]/95 backdrop-blur-2xl border border-[var(--bento-border)] shadow-xl p-3 flex flex-col gap-1 font-mono text-xs overflow-hidden"
          >
            {/* Quick Practice Pill in Mobile */}
            <Link
              to="/interview"
              onClick={() => {
                playClick(800, 0.03);
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white bg-neutral-900 dark:bg-white dark:text-black font-semibold shadow-xs mb-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 dark:text-amber-500 animate-pulse" />
              <span>Start Practice Interview</span>
            </Link>

            {/* Mobile Nav Links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => {
                    playClick(700, 0.02);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-neutral-950 dark:text-white bg-black/5 dark:bg-white/10 font-bold border border-black/5 dark:border-white/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </Link>
              );
            })}

            {/* Mobile Footer Section with Profile & Logout */}
            <div className="pt-2 mt-2 border-t border-[var(--bento-border)] flex flex-col gap-1">
              <Link
                to="/profile"
                onClick={() => {
                  playClick(700, 0.02);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
