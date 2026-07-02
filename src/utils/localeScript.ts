import { getCurrentAppLanguage } from '../i18n';

const JAPANESE_SCRIPT_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const HIRAGANA_KATAKANA_RE = /[\u3040-\u309F\u30A0-\u30FF]/;

/** True when text contains hiragana, katakana, or CJK (Japanese source strings). */
export function containsJapaneseScript(text: string): boolean {
  return JAPANESE_SCRIPT_RE.test(text);
}

/** True when text contains hiragana or katakana (Japanese grammar particles). */
export function containsHiraganaOrKatakana(text: string): boolean {
  return HIRAGANA_KATAKANA_RE.test(text);
}

export function isJaAppLocale(): boolean {
  return getCurrentAppLanguage() === 'ja';
}
