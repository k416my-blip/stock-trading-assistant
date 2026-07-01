import { getCurrentAppLanguage } from '../i18n';

const JAPANESE_SCRIPT_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

/** True when text contains hiragana, katakana, or CJK (Japanese source strings). */
export function containsJapaneseScript(text: string): boolean {
  return JAPANESE_SCRIPT_RE.test(text);
}

export function isJaAppLocale(): boolean {
  return getCurrentAppLanguage() === 'ja';
}
