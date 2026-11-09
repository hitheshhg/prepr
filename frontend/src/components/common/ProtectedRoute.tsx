import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mb-4" />
        <p className="text-xs font-mono text-[var(--text-muted)] tracking-wider uppercase">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
