import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import ThemeToggle from '../ui/ThemeToggle';
import { playClick } from '../../lib/sound';

const navLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Resume', path: '/analyzer', icon: FileText },
  { name: 'Interview', path: '/interview', icon: Mic },
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

  // Close dropdown on outside click
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

  return (
    <header className="bento-card p-3 sm:p-5 w-full transition-all relative z-40 overflow-visible">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Live Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/dashboard"
            onClick={() => playClick(750, 0.02)}
            className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-neutral-900 dark:text-white hover:opacity-80 transition-opacity select-none flex items-center gap-2 truncate"
          >
            <img
              src="/logo-square.png"
              alt="Prepr Logo"
              className="w-5 h-5 object-contain rounded-md shrink-0"
            />
            <span className="truncate">prepr</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-[#4ade80] border border-emerald-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#4ade80] animate-pulse" />
            <span>AI Ready</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-1 text-xs font-mono"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => playClick(700, 0.02)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'text-neutral-950 dark:text-white bg-black/5 dark:bg-white/10 font-semibold shadow-xs border border-black/10 dark:border-white/10'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Theme Toggle & Avatar Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Circular Wave Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Avatar Dropdown */}
          <div className="relative z-50" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                playClick(600, 0.02);
                setDropdownOpen(!dropdownOpen);
              }}
              className="flex items-center gap-1.5 p-1 rounded-full border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 bg-black/[0.02] dark:bg-white/[0.02] transition-colors focus:outline-none"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <Avatar src={photoURL} name={displayName} size="sm" />
              <ChevronDown className={`w-3 h-3 text-neutral-400 hidden sm:block pr-0.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--bento-bg)] border border-[var(--bento-border)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs backdrop-blur-xl">
                {/* User Summary */}
                <div className="px-3 py-2 border-b border-[var(--bento-border)] mb-1">
                  <div className="font-semibold text-neutral-900 dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{email}</div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => {
                    playClick(700, 0.02);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/10 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Profile Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => {
              playClick(500, 0.02);
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 mt-3 border-t border-[var(--bento-border)] flex flex-col gap-1 font-mono text-xs">
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
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-neutral-950 dark:text-white bg-black/5 dark:bg-white/10 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 mt-1 border-t border-[var(--bento-border)] flex flex-col gap-1">
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
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
