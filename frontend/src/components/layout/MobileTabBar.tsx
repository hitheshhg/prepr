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

export const MobileTabBar: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bento-bg)]/95 backdrop-blur-xl border-t border-[var(--bento-border)] px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => playClick()}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-mono transition-colors ${
                isActive
                  ? 'text-[var(--text-main)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
