import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import ThemeToggle from '../ui/ThemeToggle';

export const Topbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const displayName = currentUser?.displayName || userProfile?.display_name || 'Candidate';
  const email = currentUser?.email || userProfile?.email || '';
  const photoURL = currentUser?.photoURL || userProfile?.photo_url || null;

  return (
    <header className="h-16 border-b border-[var(--bento-border)] bg-[var(--bento-bg)]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 overflow-visible select-none">
      {/* Mobile Brand Title */}
      <div className="flex md:hidden items-center gap-2">
        <img
          src="/logo-square.png"
          alt="Prepr Logo"
          className="w-7 h-7 object-contain rounded-lg p-0.5 bg-neutral-900/5 dark:bg-white/10 shrink-0"
        />
        <span className="font-extrabold text-sm">
          pre<span className="text-neutral-500">pr</span>
        </span>
      </div>

      <div className="hidden md:block" />

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* User Avatar + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-neutral-500/10 transition-colors"
          >
            <Avatar src={photoURL} name={displayName} size="sm" />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none">{displayName}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono leading-none mt-1">Verified</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--bento-bg)] border border-[var(--bento-border)] shadow-2xl backdrop-blur-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[var(--bento-border)]">
                <p className="text-xs font-semibold truncate">{displayName}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">{email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
