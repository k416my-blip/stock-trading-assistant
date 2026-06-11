/** Phase13.1 — KLSE Financial Report 解析 */

export type FinancialReportMetricGrowth = {
  label: string;
  currentQuarter: number | null;
  priorYearQuarter: number | null;
  growthPct: number | null;
  growthLabelJa: string;
};

export type FinancialReportExtractedFields = {
  revenueGrowth: FinancialReportMetricGrowth | null;
  profitGrowth: FinancialReportMetricGrowth | null;
  outlook: string[];
  guidance: string[];
  risks: string[];
  opportunities: string[];
  managementCommentary: string[];
};

export type FinancialReportAnalysis = {
  stockCode: string;
  quarterEndDate: string | null;
  plainTextLength: number;
  extracted: FinancialReportExtractedFields;
  /** AI / ルールベース入力用 */
  analysisContextJa: string;
  hasExtractableData: boolean;
};

export type EarningsCallAiSummary = {
  source: 'openai' | 'rule_based';
  executiveSummaryJa: string;
  bullishFactorsJa: string[];
  bearishFactorsJa: string[];
  managementToneJa: string;
  confidenceScore: number;
  generatedAt: string;
  apiStatusJa: string;
};
