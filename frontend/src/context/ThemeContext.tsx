import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { playThemeTransitionSound } from '../lib/sound';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeCoordinates {
  x: number;
  y: number;
}

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme, coords?: ThemeCoordinates) => void;
  toggleTheme: (coords?: ThemeCoordinates) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'prepr-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Apply class and attributes to documentElement
  const applyTheme = useCallback((targetTheme: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (!active) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const initialTheme: Theme =
          stored === 'light' || stored === 'dark' || stored === 'system'
            ? stored
            : mql.matches
            ? 'dark'
            : 'light';

        setThemeState(initialTheme);
        const initialResolved: ResolvedTheme =
          initialTheme === 'system' ? getSystemTheme() : initialTheme;
        setResolvedTheme(initialResolved);
        applyTheme(initialResolved);
      } catch {
        applyTheme('dark');
      } finally {
        setMounted(true);
      }
    });

    return () => {
      active = false;
    };
  }, [applyTheme]);

  // Listen to system preference changes if theme is "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyTheme(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Core theme transition engine with Circular Wave View Transitions
  const executeThemeChange = useCallback(
    (newTheme: Theme, coords?: ThemeCoordinates) => {
      const targetResolved: ResolvedTheme =
        newTheme === 'system' ? getSystemTheme() : newTheme;

      // Play tailored auditory chime
      playThemeTransitionSound(targetResolved);

      // Check for View Transitions API support
      const doc =
        typeof document !== 'undefined'
          ? (document as Document & {
              startViewTransition?: (updateCallback: () => void | Promise<void>) => {
                ready: Promise<void>;
                finished: Promise<void>;
              };
            })
          : null;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Fallback transition for browsers lacking startViewTransition or users preferring reduced motion
      if (!doc?.startViewTransition || prefersReducedMotion) {
        applyTheme(targetResolved);
        setThemeState(newTheme);
        setResolvedTheme(targetResolved);
        try {
          localStorage.setItem(STORAGE_KEY, newTheme);
        } catch {}
        return;
      }

      // Calculate origin coordinates for radial ripple
      const defaultX = typeof window !== 'undefined' ? window.innerWidth - 60 : 0;
      const defaultY = 40;
      const x = coords?.x ?? defaultX;
      const y = coords?.y ?? defaultY;

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Trigger View Transition with DOM snapshot
      document.documentElement.classList.add('no-transition');

      const transition = doc.startViewTransition(() => {
        applyTheme(targetResolved);
        setThemeState(newTheme);
        setResolvedTheme(targetResolved);
        try {
          localStorage.setItem(STORAGE_KEY, newTheme);
        } catch {}
      });

      transition.finished.finally(() => {
        document.documentElement.classList.remove('no-transition');
      });

      // Animate circular clip path expansion with an ultra-snappy 280ms curve
      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];

          document.documentElement.animate(
            {
              clipPath: clipPath,
            },
            {
              duration: 280,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          // Transition was interrupted or cancelled
        });
    },
    [applyTheme]
  );

  const setTheme = useCallback(
    (newTheme: Theme, coords?: ThemeCoordinates) => {
      executeThemeChange(newTheme, coords);
    },
    [executeThemeChange]
  );

  const toggleTheme = useCallback(
    (coords?: ThemeCoordinates) => {
      const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
      executeThemeChange(nextTheme, coords);
    },
    [resolvedTheme, executeThemeChange]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

