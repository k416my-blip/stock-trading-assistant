export type AppLanguage = 'ja' | 'en' | 'zh-Hans';

export const APP_LANGUAGES: readonly AppLanguage[] = ['ja', 'en', 'zh-Hans'] as const;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ja' || value === 'en' || value === 'zh-Hans';
}
