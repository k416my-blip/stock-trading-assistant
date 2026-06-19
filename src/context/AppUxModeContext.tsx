import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppUxMode } from '../types/appUxMode';
import { DEFAULT_APP_UX_MODE } from '../constants/appUxMode';
import {
  appUxModeToLegacyPrefs,
  loadAppUxMode,
  saveAppUxMode,
} from '../services/appUxModeStorage';
import { useApp } from './AppContext';

type AppUxModeContextValue = {
  appUxMode: AppUxMode;
  ready: boolean;
  setAppUxMode: (mode: AppUxMode) => Promise<void>;
  isBeginnerMode: boolean;
  isStandardMode: boolean;
  isProMode: boolean;
};

const AppUxModeContext = createContext<AppUxModeContextValue | null>(null);

export function AppUxModeProvider({ children }: { children: ReactNode }) {
  const { saveAiPreferences } = useApp();
  const [appUxMode, setAppUxModeState] = useState<AppUxMode>(DEFAULT_APP_UX_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const mode = await loadAppUxMode();
      if (!mounted) return;
      setAppUxModeState(mode);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setAppUxMode = useCallback(
    async (mode: AppUxMode) => {
      setAppUxModeState(mode);
      await saveAppUxMode(mode);
      await saveAiPreferences(appUxModeToLegacyPrefs(mode));
    },
    [saveAiPreferences],
  );

  const value = useMemo(
    (): AppUxModeContextValue => ({
      appUxMode,
      ready,
      setAppUxMode,
      isBeginnerMode: appUxMode === 'beginner',
      isStandardMode: appUxMode === 'standard',
      isProMode: appUxMode === 'pro',
    }),
    [appUxMode, ready, setAppUxMode],
  );

  return <AppUxModeContext.Provider value={value}>{children}</AppUxModeContext.Provider>;
}

export function useAppUxMode(): AppUxModeContextValue {
  const ctx = useContext(AppUxModeContext);
  if (!ctx) {
    throw new Error('useAppUxMode must be used within AppUxModeProvider');
  }
  return ctx;
}

export function useAppUxModeOptional(): AppUxModeContextValue | null {
  return useContext(AppUxModeContext);
}
