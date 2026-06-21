import type { AppLanguage } from '../types/appLanguage';

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'ja';

export const SUPPORTED_APP_LANGUAGES: readonly AppLanguage[] = ['ja', 'en', 'zh-Hans'];

export const I18N_NAMESPACES = [
  'common',
  'navigation',
  'home',
  'portfolio',
  'stockCheck',
  'concierge',
  'settings',
  'rakutenImport',
  'errors',
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const APP_LANGUAGE_NATIVE_LABELS: Record<AppLanguage, string> = {
  ja: '日本語',
  en: 'English',
  'zh-Hans': '简体中文',
};
