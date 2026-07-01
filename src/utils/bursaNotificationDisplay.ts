import type { TFunction } from 'i18next';
import { translateAlertTrigger } from './alertsI18nHelpers';
import { isJaAppLocale } from './localeScript';

const MISSING_JA = 'データ未取得';

const SELL_KIND_JA: Record<string, string> = {
  利益確定: 'fallbacks.sellKindProfitTaking',
  損切り: 'fallbacks.sellKindStopLoss',
};

const MATERIAL_QUALITY_KEY: Record<string, string> = {
  'Bursa+RSS+News+X+Reddit': 'materialQualityLabels.fullStack',
  'Bursa+RSS+News': 'materialQualityLabels.bursaRssNews',
  'Bursa+RSS': 'materialQualityLabels.bursaRss',
  'RSSのみ': 'materialQualityLabels.rssOnly',
  データ不足: 'materialQualityLabels.insufficient',
};

type NotificationTitleInput = {
  titleJa: string;
  triggerKindJa?: string;
  stockCodeJa?: string;
};

function translateSellKind(t: TFunction<'alerts'>, kindJa: string): string {
  const key = SELL_KIND_JA[kindJa];
  return key ? t(key) : kindJa;
}

function translateBodySegment(t: TFunction<'alerts'>, segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed || trimmed === MISSING_JA) {
    return formatMissingDataLabel(t);
  }

  let m = trimmed.match(/^(.+?)の純利益が([\d.]+)%増加（(.+) → (.+)）$/);
  if (m) {
    return t('netProfitIncrease', {
      symbol: m[1],
      pct: m[2],
      from: m[3],
      to: m[4],
    });
  }

  m = trimmed.match(/^(.+?)の純利益が([\d.]+)%減少（(.+) → (.+)）$/);
  if (m) {
    return t('netProfitDecrease', {
      symbol: m[1],
      pct: m[2],
      from: m[3],
      to: m[4],
    });
  }

  m = trimmed.match(/^割安\s*([\d.]+)%\s*·\s*総合\s*(\d+)位$/);
  if (m) {
    return t('undervaluedRank', { pct: m[1], rank: m[2] });
  }

  m = trimmed.match(/^ランキング(\d+)位$/);
  if (m) {
    return t('rankPosition', { rank: m[1] });
  }

  if (trimmed === '増配') return t('triggers.dividendIncrease');
  if (trimmed === '減配') return t('triggers.dividendDecrease');

  m = trimmed.match(/^(.+) — (利益確定|損切り)$/);
  if (m) {
    return `${m[1]} — ${translateSellKind(t, m[2])}`;
  }

  m = trimmed.match(/^(.+) — (.+)$/);
  if (m && m[2] in SELL_KIND_JA) {
    return `${m[1]} — ${translateSellKind(t, m[2])}`;
  }

  return trimmed;
}

export function formatMissingDataLabel(t: TFunction<'alerts'>): string {
  if (isJaAppLocale()) return MISSING_JA;
  return t('dataUnavailable');
}

export function formatNotificationTitleDisplay(
  n: NotificationTitleInput,
  t: TFunction<'alerts'>,
): string {
  if (isJaAppLocale()) return n.titleJa;

  const m = n.titleJa.match(/^(.+?) — (.+)$/);
  if (m) {
    const label = m[1];
    const suffix = m[2];
    if (suffix in SELL_KIND_JA) {
      return `${label} — ${translateSellKind(t, suffix)}`;
    }
    const trigger = n.triggerKindJa ?? suffix;
    return `${label} — ${translateAlertTrigger(t, trigger)}`;
  }

  if (n.triggerKindJa) {
    return translateAlertTrigger(t, n.triggerKindJa);
  }

  return n.titleJa;
}

export function formatNotificationMessageDisplay(
  messageJa: string,
  t: TFunction<'alerts'>,
  _stockCodeJa?: string,
): string {
  if (isJaAppLocale()) return messageJa;
  if (!messageJa || messageJa === MISSING_JA) {
    return formatMissingDataLabel(t);
  }

  return messageJa
    .split(' · ')
    .map((part) => translateBodySegment(t, part))
    .join(' · ');
}

export function formatTodayActionDisplay(todayActionJa: string, t: TFunction<'alerts'>): string {
  if (isJaAppLocale()) return todayActionJa;

  const prefix = '本日の最重要行動: ';
  const body = todayActionJa.startsWith(prefix)
    ? todayActionJa.slice(prefix.length)
    : todayActionJa;

  if (body === MISSING_JA) {
    return t('todayActionPrefix', { action: formatMissingDataLabel(t) });
  }

  let m = body.match(/^(.+?)を([\d,]+)株購入推奨$/);
  if (m) {
    return t('todayActionPrefix', {
      action: t('recommendedBuyShares', { symbol: m[1], shares: m[2].replace(/,/g, '') }),
    });
  }

  m = body.match(/^(.+?)(買い増し|買い検討)$/);
  if (m) {
    const verb =
      m[2] === '買い増し' ? t('fallbacks.addToPosition') : t('fallbacks.considerBuy');
    return t('todayActionPrefix', { action: `${m[1]} ${verb}` });
  }

  const titleLike = formatNotificationTitleDisplay({ titleJa: body }, t);
  return t('todayActionPrefix', { action: titleLike });
}

export function formatTodayReasonDisplay(reasonJa: string, t: TFunction<'alerts'>): string {
  if (isJaAppLocale()) return reasonJa;
  return translateBodySegment(t, reasonJa);
}

export function formatMaterialQualityLabelDisplay(labelJa: string, t: TFunction<'alerts'>): string {
  if (isJaAppLocale()) return labelJa;
  const key = MATERIAL_QUALITY_KEY[labelJa];
  if (key) return t(key);
  if (labelJa.includes('+')) {
    return labelJa;
  }
  return labelJa;
}
