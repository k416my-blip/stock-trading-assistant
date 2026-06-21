import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Localization from 'expo-localization';
import type { AppLanguage } from '../types/appLanguage';
import { APP_LANGUAGES } from '../types/appLanguage';
import {
  APP_LANGUAGE_NATIVE_LABELS,
  DEFAULT_APP_LANGUAGE,
} from '../i18n/config';
import { changeAppLanguage, initI18n } from '../i18n';
import {
  loadAppLanguage,
  saveAppLanguage,
} from '../services/appLanguageStorage';

type AppLanguageContextValue = {
  appLanguage: AppLanguage;
  ready: boolean;
  languageChosen: boolean;
  needsLanguagePicker: boolean;
  setAppLanguage: (language: AppLanguage) => Promise<void>;
  confirmInitialLanguage: (language: AppLanguage) => Promise<void>;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function deviceLocaleSuggestion(): AppLanguage {
  const locales = Localization.getLocales();
  const code = locales[0]?.languageCode?.toLowerCase() ?? '';
  if (code === 'ja') return 'ja';
  if (code === 'zh') return 'zh-Hans';
  if (code === 'en') return 'en';
  return DEFAULT_APP_LANGUAGE;
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [ready, setReady] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await loadAppLanguage();
      const initial = stored ?? deviceLocaleSuggestion();
      await initI18n(initial);
      if (!mounted) return;
      setAppLanguageState(initial);
      setLanguageChosen(stored !== null);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setAppLanguage = useCallback(async (language: AppLanguage) => {
    await changeAppLanguage(language);
    setAppLanguageState(language);
    await saveAppLanguage(language);
    setLanguageChosen(true);
  }, []);

  const confirmInitialLanguage = useCallback(
    async (language: AppLanguage) => {
      await setAppLanguage(language);
    },
    [setAppLanguage],
  );

  const value = useMemo(
    (): AppLanguageContextValue => ({
      appLanguage,
      ready,
      languageChosen,
      needsLanguagePicker: ready && !languageChosen,
      setAppLanguage,
      confirmInitialLanguage,
    }),
    [appLanguage, ready, languageChosen, setAppLanguage, confirmInitialLanguage],
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage(): AppLanguageContextValue {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    throw new Error('useAppLanguage must be used within AppLanguageProvider');
  }
  return ctx;
}

export function useAppLanguageOptional(): AppLanguageContextValue | null {
  return useContext(AppLanguageContext);
}

export const LANGUAGE_PICKER_OPTIONS: readonly AppLanguage[] = APP_LANGUAGES;

export function nativeLabelForAppLanguage(language: AppLanguage): string {
  return APP_LANGUAGE_NATIVE_LABELS[language];
}
