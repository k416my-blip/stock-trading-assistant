import type { TFunction } from 'i18next';
import type { NewsApiFailureKind } from '../services/newsApiConnectionDebug';
import type { Market } from '../types';
import { containsHiraganaOrKatakana, isJaAppLocale } from './localeScript';

export function getMarketLabelI18n(t: TFunction<'settings'>, market: Market): string {
  return t(`markets.${market}`);
}

export function getNewsApiFailureKindLabelI18n(
  t: TFunction<'settings'>,
  kind: NewsApiFailureKind,
): string {
  return t(`apiTest.failureKinds.${kind}`);
}

/** Avoid showing Japanese diagnostic text in en / zh-Hans UI. */
export function formatApiTestErrorReason(
  t: TFunction<'settings'>,
  reasonJa?: string | null,
  reason?: string | null,
): string {
  if (isJaAppLocale()) {
    return reasonJa ?? reason ?? t('apiTest.empty');
  }
  const candidate = reason?.trim();
  if (candidate && !containsHiraganaOrKatakana(candidate)) {
    return candidate;
  }
  return t('apiTest.errorDetailsUnavailable');
}

export function formatApiTestLocaleDateTime(iso: string, locale: string): string {
  const tag = locale === 'ja' ? 'ja-JP' : locale === 'zh-Hans' ? 'zh-CN' : 'en-US';
  return new Date(iso).toLocaleString(tag);
}
