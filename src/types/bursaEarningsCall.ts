/** Phase13 — Earnings Call 解析ドメイン型 */
import type {
  EarningsCallAiSummary,
  FinancialReportAnalysis,
} from './bursaFinancialReportAnalysis';

export type EarningsCallDataAvailability =
  | 'available'
  | 'unavailable'
  | 'api_not_configured'
  | 'not_applicable';

export type EarningsCallRecordSource =
  | 'finnhub_api'
  | 'klse_financial_report'
  | 'klse_announcement'
  | 'financial_report_analysis'
  | 'none';

export type EarningsCallFallbackSource = 'transcript' | 'financial_report' | 'none';

export type EarningsCallStoredRecord = {
  stockCode: string;
  companyName: string | null;
  eventDate: string | null;
  transcriptExcerpt: string | null;
  summaryExcerpt: string | null;
  source: EarningsCallRecordSource;
  fetchedAt: string;
};

export type EarningsCallToneScores = {
  ceoToneScore: number;
  cfoToneScore: number;
  managementToneScore: number;
  bullishWordCount: number;
  bearishWordCount: number;
};

export type EarningsCallDisplayFields = {
  managementTone: string;
  guidance: string;
  qaWatchpoints: string;
};

export type BursaEarningsCallAnalysis = {
  availability: EarningsCallDataAvailability;
  availabilityLabelJa: string;
  record: EarningsCallStoredRecord | null;
  tone: EarningsCallToneScores | null;
  guidanceSummaryJa: string;
  qaRiskPointsJa: string[];
  displayJa: EarningsCallDisplayFields;
  /** AI分析 項目8 用 1行評価 */
  evaluationJa: string;
  overallScore: number;
  /** Phase13.1 Financial Report 解析 */
  financialReportAnalysis: FinancialReportAnalysis | null;
  /** Phase13.3 AI / ルールベース Summary */
  aiSummary: EarningsCallAiSummary | null;
  /** Phase13.2 フォールバック経路 */
  fallbackSource: EarningsCallFallbackSource;
  summaryGenerated: boolean;
};

export type { EarningsCallAiSummary, FinancialReportAnalysis } from './bursaFinancialReportAnalysis';

export const EARNINGS_CALL_UNAVAILABLE_JA = 'データ未取得';
export const EARNINGS_CALL_API_NOT_CONFIGURED_JA = 'API未設定';
export const EARNINGS_CALL_NOT_APPLICABLE_JA = '対象外';
