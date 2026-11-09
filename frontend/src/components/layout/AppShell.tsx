import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors duration-200 flex flex-col items-center pt-3 sm:pt-6 pb-12 sm:pb-20 px-3 sm:px-6">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6 min-w-0">
        {/* Bento Header Navbar */}
        <Navbar />

        {/* Main Content Stage */}
        <main className="w-full min-w-0">
          {children}
        </main>

        {/* Minimal Bento Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default AppShell;
