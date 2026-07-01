import type { TFunction } from 'i18next';

const TRIGGER_KEY_BY_JA: Record<string, string> = {
  強気買い: 'triggers.strongBuy',
  買い: 'triggers.buy',
  注意: 'triggers.caution',
  売却候補: 'triggers.sellCandidate',
  増配: 'triggers.dividendIncrease',
  減配: 'triggers.dividendDecrease',
  利益急増: 'triggers.profitSurge',
  利益急減: 'triggers.profitDrop',
  順位急上昇: 'triggers.rankSurge',
  順位急落: 'triggers.rankDrop',
};

const CATEGORY_KEY_BY_JA: Record<string, string> = {
  買い: 'categories.buy',
  売り: 'categories.sell',
  配当: 'categories.dividend',
  決算: 'categories.earnings',
  監視: 'categories.watch',
  市場全体: 'categories.market',
};

export function translateAlertTrigger(t: TFunction<'alerts'>, triggerKindJa: string): string {
  const key = TRIGGER_KEY_BY_JA[triggerKindJa];
  return key ? t(key) : triggerKindJa;
}

export function translateAlertCategory(t: TFunction<'alerts'>, categoryJa: string): string {
  const key = CATEGORY_KEY_BY_JA[categoryJa];
  return key ? t(key) : categoryJa;
}
