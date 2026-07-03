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
import { APP_LANGUAGES, normalizeAppLanguage } from '../types/appLanguage';
import {
  APP_LANGUAGE_NATIVE_LABELS,
  DEFAULT_APP_LANGUAGE,
} from '../i18n/config';
import { changeAppLanguage, initI18n } from '../i18n';
import { confirmInitialAppLanguage } from '../services/appLanguageConfirm';
import {
  loadAppLanguage,
  saveAppLanguage,
} from '../services/appLanguageStorage';

type AppLanguageContextValue = {
  appLanguage: AppLanguage;
  /** Bumped on every successful language switch to force navigation/UI remounts. */
  languageRevision: number;
  ready: boolean;
  languageChosen: boolean;
  needsLanguagePicker: boolean;
  setAppLanguage: (language: AppLanguage) => Promise<void>;
  confirmInitialLanguage: (language: AppLanguage) => Promise<void>;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function deviceLocaleSuggestion(): AppLanguage {
  const locales = Localization.getLocales();
  const primary = locales[0];
  const candidates = [
    primary?.languageTag,
    primary?.languageCode && primary?.regionCode
      ? `${primary.languageCode}-${primary.regionCode}`
      : null,
    primary?.languageCode,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeAppLanguage(candidate);
    if (normalized) return normalized;
  }
  return DEFAULT_APP_LANGUAGE;
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [languageRevision, setLanguageRevision] = useState(0);
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
    const normalized = normalizeAppLanguage(language);
    if (!normalized) return;
    if (normalized === appLanguage) return;
    await saveAppLanguage(normalized);
    await changeAppLanguage(normalized);
    setAppLanguageState(normalized);
    setLanguageRevision((revision) => revision + 1);
    setLanguageChosen(true);
  }, [appLanguage]);

  const confirmInitialLanguage = useCallback(
    async (language: AppLanguage) => {
      const result = await confirmInitialAppLanguage(language, appLanguage, {
        saveAppLanguage,
        changeAppLanguage,
      });
      if (!result.ok) return;
      if (result.languageChanged) {
        setAppLanguageState(result.language);
        setLanguageRevision((revision) => revision + 1);
      }
      setLanguageChosen(true);
    },
    [appLanguage],
  );

  const value = useMemo(
    (): AppLanguageContextValue => ({
      appLanguage,
      languageRevision,
      ready,
      languageChosen,
      needsLanguagePicker: ready && !languageChosen,
      setAppLanguage,
      confirmInitialLanguage,
    }),
    [appLanguage, languageRevision, ready, languageChosen, setAppLanguage, confirmInitialLanguage],
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
