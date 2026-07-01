import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { AppLanguage } from '../types/appLanguage';
import { normalizeAppLanguage } from '../types/appLanguage';
import {
  DEFAULT_APP_LANGUAGE,
  I18N_NAMESPACES,
  I18N_SUPPORTED_LNGS,
} from './config';
import { i18nResources } from './resources';

let currentAppLanguage: AppLanguage = DEFAULT_APP_LANGUAGE;

export function getCurrentAppLanguage(): AppLanguage {
  return currentAppLanguage;
}

export function setCurrentAppLanguageSync(language: AppLanguage): void {
  currentAppLanguage = language;
}

function coerceAppLanguage(language: AppLanguage | string): AppLanguage {
  return normalizeAppLanguage(language) ?? DEFAULT_APP_LANGUAGE;
}

export async function initI18n(language: AppLanguage = DEFAULT_APP_LANGUAGE): Promise<void> {
  const normalized = coerceAppLanguage(language);
  setCurrentAppLanguageSync(normalized);
  if (i18n.isInitialized) {
    await i18n.changeLanguage(normalized);
    return;
  }
  await i18n.use(initReactI18next).init({
    resources: i18nResources,
    lng: normalized,
    fallbackLng: {
      zh: ['zh-Hans', 'ja'],
      'zh-CN': ['zh-Hans', 'ja'],
      'zh-Hans': ['ja'],
      default: [DEFAULT_APP_LANGUAGE],
    },
    supportedLngs: [...I18N_SUPPORTED_LNGS],
    nonExplicitSupportedLngs: true,
    cleanCode: false,
    lowerCaseLng: false,
    load: 'currentOnly',
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function changeAppLanguage(language: AppLanguage | string): Promise<void> {
  const normalized = coerceAppLanguage(language);
  setCurrentAppLanguageSync(normalized);
  await i18n.changeLanguage(normalized);
}

export { i18n };
