import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { AppLanguage } from '../types/appLanguage';
import {
  DEFAULT_APP_LANGUAGE,
  I18N_NAMESPACES,
  SUPPORTED_APP_LANGUAGES,
} from './config';
import { i18nResources } from './resources';

let currentAppLanguage: AppLanguage = DEFAULT_APP_LANGUAGE;

export function getCurrentAppLanguage(): AppLanguage {
  return currentAppLanguage;
}

export function setCurrentAppLanguageSync(language: AppLanguage): void {
  currentAppLanguage = language;
}

export async function initI18n(language: AppLanguage = DEFAULT_APP_LANGUAGE): Promise<void> {
  setCurrentAppLanguageSync(language);
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    return;
  }
  await i18n.use(initReactI18next).init({
    resources: i18nResources,
    lng: language,
    fallbackLng: DEFAULT_APP_LANGUAGE,
    supportedLngs: [...SUPPORTED_APP_LANGUAGES],
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  setCurrentAppLanguageSync(language);
  await i18n.changeLanguage(language);
}

export { i18n };
