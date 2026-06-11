/** Phase15 — Insider Trading / Director Dealings ドメイン型 */

export type InsiderTransactionType = 'buy' | 'sell';

export type InsiderNetActivityLabel = '買い優勢' | '売り優勢' | '中立' | 'データ不足';

export type InsiderTradingSource =
  | 'klse_shareholding_changes'
  | 'klse_announcement'
  | 'klse_shareholdings_page'
  | 'yahoo_finance'
  | 'none';

export type InsiderTradingDisplayFields = {
  latestTransactionDate: string;
  transactionType: string;
  insiderName: string;
  insiderRole: string;
  transactionValue: string;
  buyCount90d: string;
  sellCount90d: string;
  netActivity: string;
  confidence: string;
};

export type BursaInsiderTradingAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  insiderBuyCount: number;
  insiderSellCount: number;
  netInsiderActivity: InsiderNetActivityLabel;
  latestTransactionDate: string | null;
  latestTransactionType: InsiderTransactionType | null;
  transactionValue: string | null;
  insiderName: string | null;
  insiderRole: string | null;
  confidenceScore: number;
  source: InsiderTradingSource;
  unavailableReason: string | null;
  displayJa: InsiderTradingDisplayFields;
  /** AI分析 項目10 用 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const INSIDER_TRADING_UNAVAILABLE_JA = 'データ未取得';
export const INSIDER_FIELD_MISSING_JA = '未取得';
