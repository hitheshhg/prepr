import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Mic,
  Award,
  Map,
} from 'lucide-react';
import { playClick } from '../../lib/sound';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyzer', label: 'Resume', icon: FileText },
  { to: '/interview', label: 'Interview', icon: Mic },
  { to: '/report', label: 'Reports', icon: Award },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[var(--bento-border)] bg-[var(--bento-bg)] backdrop-blur-xl shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--bento-border)] gap-3">
        <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-mono font-bold text-xs shadow-sm">
          PR
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-tight leading-none">
            pre<span className="text-neutral-500">pr</span>
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">AI Platform</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-6 px-3 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => playClick()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Privacy note */}
      <div className="p-4 border-t border-[var(--bento-border)] text-[11px] font-mono text-[var(--text-muted)] text-center">
        Data encrypted & secure
      </div>
    </aside>
  );
};

export default Sidebar;
