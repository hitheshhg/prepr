import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthModal } from './components/auth/AuthModal';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Dynamic route-based code splitting for sub-200kB initial load
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage'));
const InterviewRoomPage = lazy(() => import('./pages/InterviewRoomPage'));
const InterviewReportPage = lazy(() => import('./pages/InterviewReportPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const PageLoadingFallback: React.FC = () => (
  <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 select-none">
    <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
    <span className="font-mono text-xs text-[var(--text-muted)] tracking-wider">Loading Studio...</span>
  </div>
);

const AuthRouteHandler: React.FC<{
  mode: 'signin' | 'signup';
  onOpenAuth: (m?: 'signin' | 'signup') => void;
}> = ({ mode, onOpenAuth }) => {
  React.useEffect(() => {
    onOpenAuth(mode);
  }, [mode, onOpenAuth]);
  return <LandingPage onOpenAuth={onOpenAuth} />;
};

export const App: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
          <Routes>
            {/* Public Minimal Landing Page */}
            <Route
              path="/"
              element={<LandingPage onOpenAuth={handleOpenAuth} />}
            />

            {/* Direct Auth URLs opening corresponding modal tab */}
            <Route
              path="/signin"
              element={
                <AuthRouteHandler
                  mode="signin"
                  onOpenAuth={handleOpenAuth}
                />
              }
            />
            <Route
              path="/signup"
              element={
                <AuthRouteHandler
                  mode="signup"
                  onOpenAuth={handleOpenAuth}
                />
              }
            />

            {/* Protected SaaS App with Left Sidebar & Topbar */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <DashboardPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyzer"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ResumeAnalyzerPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <InterviewRoomPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <InterviewReportPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/:sessionId"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <InterviewReportPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/roadmap"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <RoadmapPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <ProfilePage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect to / */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Authentication Modal */}
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authMode}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
};

export default App;
