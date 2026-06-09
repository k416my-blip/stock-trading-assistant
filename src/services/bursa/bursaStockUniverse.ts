/**
 * Bursa Phase 6 — ランキング対象銘柄ユニバース（KLSE Screener セクター同業リスト）
 */
import { SECTOR_PEER_CODES } from './bursaSectorPeers';

export function getBursaUniverseStockCodes(): string[] {
  const set = new Set<string>();
  for (const codes of Object.values(SECTOR_PEER_CODES)) {
    for (const code of codes) {
      set.add(code.replace(/\.KL$/i, '').trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

export const BURSA_PORTFOLIO_BUDGETS_MYR = [1000, 5000, 10000, 50000] as const;

/** Phase 8 — 今日の売買 資金配分プリセット */
export const BURSA_TODAY_BUDGETS_MYR = [1000, 3000, 5000, 10000, 50000] as const;

export type BursaTodayBudgetMYR = (typeof BURSA_TODAY_BUDGETS_MYR)[number];

export type BursaPortfolioBudgetMYR = (typeof BURSA_PORTFOLIO_BUDGETS_MYR)[number];

export const BURSA_INVESTMENT_STYLES = [
  'composite',
  'dividend',
  'growth',
  'value',
  'stability',
  'beginner',
] as const;

export type BursaInvestmentStyleId = (typeof BURSA_INVESTMENT_STYLES)[number];

export const BURSA_INVESTMENT_STYLE_LABELS: Record<BursaInvestmentStyleId, string> = {
  composite: '総合',
  dividend: '高配当',
  growth: '成長',
  value: '割安',
  stability: '安定',
  beginner: '初心者向け',
};
