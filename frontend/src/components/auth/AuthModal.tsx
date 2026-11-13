import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playClick } from '../../lib/sound';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name.');
        await signupWithEmail(email, password, name.trim());
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
          setError('Invalid email or password combination.');
        } else if (msg.includes('auth/email-already-in-use')) {
          setError('An account with this email already exists.');
        } else if (msg.includes('auth/weak-password')) {
          setError('Password should be at least 6 characters.');
        } else {
          setError(err.message.replace('Firebase: ', ''));
        }
      } else {
        setError('An unexpected authentication error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    playClick();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (!err.message.includes('auth/popup-closed-by-user')) {
          setError(err.message.replace('Firebase: ', ''));
        }
      } else {
        setError('Failed to authenticate with Google.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window: Bento Architecture */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md rounded-3xl bento-card border border-[var(--bento-border)] p-6 sm:p-8 bg-[var(--bento-bg)] text-[var(--text-main)] shadow-2xl z-10 overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="Prepr Logo"
              className="w-20 h-auto object-contain mx-auto mb-2 drop-shadow"
            />
            <div className="inline-flex wix-pill text-[10px] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure Authentication
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {isSignUp ? 'Create your Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {isSignUp
                ? 'Join prepr to practice voice interviews and analyze resumes'
                : 'Sign in to access your interview reports and roadmap'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-neutral-500/5 hover:bg-neutral-500/10 border border-[var(--bento-border)] text-xs font-mono font-medium text-[var(--text-main)] transition-colors disabled:opacity-50 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-[var(--bento-border)] w-full" />
            <span className="bg-[var(--bento-bg)] px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              or with email
            </span>
            <div className="border-t border-[var(--bento-border)] w-full" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-muted)] mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hithesh HG"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] text-[var(--text-main)] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-medium text-[var(--text-muted)] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] text-[var(--text-main)] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-[var(--text-muted)] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] text-[var(--text-main)] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-wider font-semibold transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-4 text-center text-xs text-[var(--text-muted)] font-mono">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsSignUp(false);
                    setError(null);
                  }}
                  className="text-[var(--text-main)] font-semibold underline underline-offset-2 ml-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsSignUp(true);
                    setError(null);
                  }}
                  className="text-[var(--text-main)] font-semibold underline underline-offset-2 ml-1"
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
