export type AppLanguage = 'ja' | 'en' | 'zh-Hans';

export const APP_LANGUAGES: readonly AppLanguage[] = ['ja', 'en', 'zh-Hans'] as const;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ja' || value === 'en' || value === 'zh-Hans';
}

/**
 * Maps device tags, legacy storage values, and aliases to a supported AppLanguage.
 * Returns null when the input cannot be mapped (e.g. fr, de).
 */
export function normalizeAppLanguage(input: unknown): AppLanguage | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  if (isAppLanguage(raw)) return raw;

  const lower = raw.toLowerCase().replace(/_/g, '-');

  if (lower === 'ja' || lower === 'ja-jp' || lower === 'japanese' || lower.startsWith('ja-')) {
    return 'ja';
  }
  if (lower === 'en' || lower === 'english' || lower.startsWith('en-')) {
    return 'en';
  }
  if (
    lower === 'zh' ||
    lower === 'zh-cn' ||
    lower === 'zh-hans' ||
    lower === 'zh-hans-cn' ||
    lower === 'chinese' ||
    lower === 'simplified-chinese' ||
    lower.startsWith('zh-') ||
    lower.startsWith('zh')
  ) {
    return 'zh-Hans';
  }

  return null;
}
