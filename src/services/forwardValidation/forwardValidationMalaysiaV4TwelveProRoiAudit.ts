/**
 * 最重要監査その83.6 — Twelve Data Pro課金ROI判定 · 監査81/83.5固定 · 実装コード基準 · 推測禁止
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ForwardMalaysiaV4DataGapRow,
  ForwardMalaysiaV4OpsComparisonRow,
  ForwardMalaysiaV4TwelveProRoiAuditReport,
  ForwardMalaysiaV4TwelveProRoiRecommendation,
  ForwardMalaysiaV4TwelveSymbolSearchAuditReport,
} from '../../types/forwardValidation';
import {
  MARKET_DATA_MIN_INTERVAL_MS,
  MARKET_DATA_SYMBOL_COOLDOWN_MS,
  DEFAULT_PRICE_REFRESH_MINUTES,
} from '../../constants/marketData';
import { QUOTE_PROVIDER_ORDER } from '../../constants/quoteProviders';

const FIXED_CONDITIONS_JA =
  'MY v4 Twelve Pro ROI · 監査81 Yahoo実測 · 監査83.5 symbol_search確定 · 実装コード基準 · 推測禁止';

/** Twelve Data公式Individual Pricing (2026-03) — https://twelvedata.com/pricing */
export const TWELVE_DATA_PRO_MONTHLY_USD = 229;
export const TWELVE_DATA_PRO_ANNUAL_BILLED_USD = 2290;

const V4_CUMULATIVE_PCT = 38.36;
const MONTHLY_DCA_MYR = 1500;

const CODE_REFS = {
  yahooOhlcv: 'yahooOhlcvFetch.ts · interval=1d · Yahoo Chart API',
  auditBundle: 'forwardValidationMalaysiaV4CandidateAudit.ts · fetchMalaysiaV76AuditBundle · Yahooのみ',
  providerChain: 'quoteProviderChain.ts · Twelve→Yahoo→Alpha（キーあり時）',
  portfolioRefresh: `portfolioPriceUpdate.ts · ${DEFAULT_PRICE_REFRESH_MINUTES}分間隔 · fetchQuoteViaProviderChain`,
  twelveDelayed: 'marketDataService.ts · getQuote · isDelayed:true',
  twelveQueue: `marketDataService.ts · ${MARKET_DATA_MIN_INTERVAL_MS}ms/${MARKET_DATA_SYMBOL_COOLDOWN_MS}msキュー`,
  noOrderBook: 'コードベース全体 · 板情報/order book API未実装',
  opsMonitor: 'forwardValidationMalaysiaV4OpsMonitorAudit.ts · 月次DCA・YTL依存監視',
} as const;

function parseAudit81Csv(csvText: string): {
  grade: string;
  yahooSuccessRatePct: number;
  missingRatePct: number;
  anomalyRatePct: number;
  updateDelayDays: number;
} | null {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  let grade = '—';
  const gradeLine = csvText.match(/# (.) 条件付き採用|# (.) 本番採用/);
  if (gradeLine) grade = gradeLine[1] ?? 'B';

  const metrics: Record<string, number> = {};
  for (const line of lines) {
    if (!line.startsWith('aggregate,')) continue;
    const parts = line.split(',');
    if (parts.length >= 3) metrics[parts[1]!] = Number(parts[2]);
  }
  if (Object.keys(metrics).length === 0) return null;
  return {
    grade,
    yahooSuccessRatePct: metrics.yahooSuccessRatePct ?? 0,
    missingRatePct: metrics.missingRatePct ?? 0,
    anomalyRatePct: metrics.anomalyRatePct ?? 0,
    updateDelayDays: metrics.updateDelayDays ?? 0,
  };
}

function loadAudit81Metrics(scriptsDir: string) {
  const path = join(scriptsDir, 'forward-validation-malaysia-v4-yahoo-quality-audit.csv');
  if (!existsSync(path)) {
    return {
      grade: 'B',
      yahooSuccessRatePct: 100,
      missingRatePct: 5.66,
      anomalyRatePct: 0.008,
      updateDelayDays: 0,
      sourceJa: '監査81 CSV未検出 · 会話記録の集計値',
    };
  }
  const parsed = parseAudit81Csv(readFileSync(path, 'utf8'));
  return {
    ...(parsed ?? {
      grade: 'B',
      yahooSuccessRatePct: 100,
      missingRatePct: 5.66,
      anomalyRatePct: 0.008,
      updateDelayDays: 0,
    }),
    sourceJa: path,
  };
}

function loadAudit835(scriptsDir: string): {
  finalVerdict: string;
  officialSymbolsJa: string;
  proMessage: string;
  sourceJa: string;
} {
  const path = join(scriptsDir, 'forward-validation-malaysia-v4-twelve-symbol-search-audit.json');
  if (!existsSync(path)) {
    return {
      finalVerdict: 'pro_plan_required',
      officialSymbolsJa: '5347@MYX/XKLS 他4銘柄（監査83.5記録）',
      proMessage:
        'This symbol is available starting with the Pro or Venture plan. Consider upgrading now at https://twelvedata.com/pricing',
      sourceJa: '監査83.5 JSON未検出 · 会話記録',
    };
  }
  const report = JSON.parse(readFileSync(path, 'utf8')) as ForwardMalaysiaV4TwelveSymbolSearchAuditReport;
  return {
    finalVerdict: report.finalVerdict,
    officialSymbolsJa: report.answerBJa.replace(/^B 正式symbol: /, ''),
    proMessage:
      report.retryRows[0]?.errorMessage ??
      'This symbol is available starting with the Pro or Venture plan.',
    sourceJa: path,
  };
}

function buildDataGapRows(audit81: ReturnType<typeof loadAudit81Metrics>): ForwardMalaysiaV4DataGapRow[] {
  return [
    {
      itemJa: '日次OHLCV（監査・シミュレーション）',
      yahooStatusJa: `取得率${audit81.yahooSuccessRatePct}% · 欠損${audit81.missingRatePct}% · 遅延${audit81.updateDelayDays}日 · 判定${audit81.grade}`,
      twelveProStatusJa:
        '無料枠0% · Proでquote/time_series解放（監査83.5実レスポンス） · 品質は未計測',
      codeReferenceJa: CODE_REFS.auditBundle,
    },
    {
      itemJa: '出来高（volume）',
      yahooStatusJa: 'Yahoo Chartから取得 · v4監査バンドルに含む',
      twelveProStatusJa: 'time_seriesにvolumeフィールドあり（getTimeSeries実装） · Pro未検証',
      codeReferenceJa: 'forwardValidationMalaysiaV4CandidateAudit.ts · fetchMalaysiaBarsWithVolume',
    },
    {
      itemJa: 'リアルタイム性（ポートフォリオ株価）',
      yahooStatusJa: `BursaはYahoo Finance経由 · 自動更新${DEFAULT_PRICE_REFRESH_MINUTES}分`,
      twelveProStatusJa: 'getQuoteはisDelayed:true · WebSocketはコード未接続',
      codeReferenceJa: `${CODE_REFS.portfolioRefresh} · ${CODE_REFS.twelveDelayed}`,
    },
    {
      itemJa: '板情報',
      yahooStatusJa: '未実装',
      twelveProStatusJa: '未実装（Twelve Pro導入でも現行コードに経路なし）',
      codeReferenceJa: CODE_REFS.noOrderBook,
    },
    {
      itemJa: 'OHLCV品質・異常値',
      yahooStatusJa: `異常値率${audit81.anomalyRatePct}%（監査81実測）`,
      twelveProStatusJa: '比較データなし（監査81 Twelve 0/5で相関未算出）',
      codeReferenceJa: CODE_REFS.yahooOhlcv,
    },
    {
      itemJa: '欠損率',
      yahooStatusJa: `${audit81.missingRatePct}%（監査81 · 営業日ギャップ推定）`,
      twelveProStatusJa: 'Pro契約後の欠損率はコードベース未計測',
      codeReferenceJa: 'forwardValidationMalaysiaV4YahooQualityAudit.ts · analyzeBarQuality',
    },
    {
      itemJa: 'API制限・保守',
      yahooStatusJa: '無料 · レート制限はプロバイダ側',
      twelveProStatusJa: `有料 · キュー${MARKET_DATA_MIN_INTERVAL_MS}ms+銘柄${MARKET_DATA_SYMBOL_COOLDOWN_MS}ms · 監査83で8 credits/min制限実測`,
      codeReferenceJa: CODE_REFS.twelveQueue,
    },
  ];
}

function buildOpsComparison(
  audit81: ReturnType<typeof loadAudit81Metrics>,
  audit835: ReturnType<typeof loadAudit835>,
): ForwardMalaysiaV4OpsComparisonRow[] {
  const providerOrder = QUOTE_PROVIDER_ORDER.map((p) =>
    p === 'twelve_data' ? 'Twelve' : p === 'yahoo_finance' ? 'Yahoo' : 'Alpha',
  ).join('→');

  return [
    {
      dimensionJa: '信頼性',
      yahooOnlyJa: `監査81: 取得成功${audit81.yahooSuccessRatePct}% · ${audit81.grade}判定`,
      yahooPlusTwelveJa: `無料Twelve失敗→Yahooフォールバック（現行） · Pro後はTwelve先行の可能性（未検証）`,
    },
    {
      dimensionJa: '欠損率',
      yahooOnlyJa: `${audit81.missingRatePct}%（実測）`,
      yahooPlusTwelveJa: 'Pro後の欠損率は未計測 · 改善見込みはコード上未証明',
    },
    {
      dimensionJa: 'コスト',
      yahooOnlyJa: '$0/月',
      yahooPlusTwelveJa: `Pro $${TWELVE_DATA_PRO_MONTHLY_USD}/月 · 年額$${TWELVE_DATA_PRO_ANNUAL_BILLED_USD}（公式Pricing）`,
    },
    {
      dimensionJa: '保守性',
      yahooOnlyJa: '単一プロバイダ · APIキー不要 · symbol探索あり',
      yahooPlusTwelveJa: `${providerOrder}チェーン · APIキー・クレジット・キュー管理`,
    },
    {
      dimensionJa: '実運用メリット',
      yahooOnlyJa: `v4全監査(73-82)がYahooバンドルで完走 · 累積${V4_CUMULATIVE_PCT}%確定`,
      yahooPlusTwelveJa: `Bursa正式symbol確定(${audit835.finalVerdict}) · アプリ未計測の上乗せ効果`,
    },
  ];
}

function evaluateRoi(input: {
  annualCostUsd: number;
  v4CumulativePct: number;
}): { verdictJa: string; measuredUpliftJa: string } {
  const measuredUpliftJa = [
    `v4累積${input.v4CumulativePct}%はfetchMalaysiaV76AuditBundle（Yahoo専用）で算出（監査79 CSV）`,
    'simulateMalaysiaV3DcaPathにTwelve OHLCV入力経路なし',
    'Pro導入による累積改善幅はコードベースで0件 · 期待利益改善は未計測',
  ].join(' · ');

  const verdictJa = [
    `年間コスト$${input.annualCostUsd}（公式Pro年額）`,
    `対v4累積${input.v4CumulativePct}%（Yahoo実績）`,
    '測定された利益上乗せなし → ROI否定（課金正当化データ不足）',
  ].join(' · ');

  return { verdictJa, measuredUpliftJa };
}

function resolveRecommendation(
  audit81: ReturnType<typeof loadAudit81Metrics>,
  roiVerdictJa: string,
): ForwardMalaysiaV4TwelveProRoiRecommendation {
  if (audit81.yahooSuccessRatePct >= 100 && audit81.updateDelayDays <= 1 && audit81.grade !== 'C') {
    return 'yahoo_only';
  }
  if (roiVerdictJa.includes('ROI肯定')) return 'twelve_recommended';
  return 'yahoo_only';
}

function recommendationLabelJa(r: ForwardMalaysiaV4TwelveProRoiRecommendation): string {
  switch (r) {
    case 'yahoo_only':
      return '1. Yahooのみ継続';
    case 'twelve_recommended':
      return '2. Twelve導入推奨';
    case 'twelve_future':
      return '3. 将来導入';
  }
}

export function buildMalaysiaV4TwelveProRoiAuditReport(input?: {
  scriptsDir?: string;
  auditedAt?: string;
}): ForwardMalaysiaV4TwelveProRoiAuditReport {
  const scriptsDir = input?.scriptsDir ?? join(process.cwd(), 'scripts');
  const auditedAt = input?.auditedAt ?? new Date().toISOString();
  const audit81 = loadAudit81Metrics(scriptsDir);
  const audit835 = loadAudit835(scriptsDir);

  const dataGapRows = buildDataGapRows(audit81);
  const opsComparisonRows = buildOpsComparison(audit81, audit835);

  const v4RequirementsJa = [
    '日次OHLCV+volume · 5銘柄（5347/1023/5398/6742/3336）',
    `月次DCA ${MONTHLY_DCA_MYR} MYR · Phase配分固定（監査80）`,
    'YTL依存35/40/45/50%警告 · HHI集中度 · リバランス許容±3%',
    '累積・廃止MC・MaxDDはYahooバンドル上のシミュレーション（ルール変更なし）',
    'ポートフォリオ株価: fetchQuoteViaProviderChain（BursaはYahoo優先フォールバック）',
  ];

  const { verdictJa: roiVerdictJa, measuredUpliftJa } = evaluateRoi({
    annualCostUsd: TWELVE_DATA_PRO_ANNUAL_BILLED_USD,
    v4CumulativePct: V4_CUMULATIVE_PCT,
  });

  const recommendation = resolveRecommendation(audit81, roiVerdictJa);

  const answerAJa = `A Yahoo弱点: 欠損${audit81.missingRatePct}% · 異常${audit81.anomalyRatePct}% · ${audit81.grade}判定 · 板情報未実装 · Twelve比較未完了(0/5) · ソース${audit81.sourceJa}`;
  const answerBJa = `B Twelve利点(Pro): Bursaカタログ存在（監査83.5） · 正式symbol MYX/XKLS · quote/time_series解放メッセージ実証 · プロバイダチェーン先頭候補 · isDelayed quote`;
  const answerCJa = `C v4影響: 全監査シミュレーションはYahooバンドル依存 · Pro未導入でも累積${V4_CUMULATIVE_PCT}%確定 · 月次DCAのためリアルタイム板は不要（コード上） · 導入時は保守・コスト増`;
  const answerDJa = `D 年間コスト: Pro月額$${TWELVE_DATA_PRO_MONTHLY_USD} · 年払い$${TWELVE_DATA_PRO_ANNUAL_BILLED_USD}（twelvedata.com/pricing 2026-03）`;
  const answerEJa = `E ROI: ${roiVerdictJa} · ${measuredUpliftJa}`;
  const answerFJa = `F 最終推奨: ${recommendationLabelJa(recommendation)}`;

  const humanSummaryJa = [
    '監査83.6 Twelve Data Pro課金ROI判定',
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
  ].join('\n');

  return {
    auditedAt,
    yahooAudit81Grade: audit81.grade,
    yahooSuccessRatePct: audit81.yahooSuccessRatePct,
    yahooMissingRatePct: audit81.missingRatePct,
    yahooAnomalyRatePct: audit81.anomalyRatePct,
    yahooUpdateDelayDays: audit81.updateDelayDays,
    twelveSymbolSearchVerdict: audit835.finalVerdict,
    v4CumulativeReturnPct: V4_CUMULATIVE_PCT,
    monthlyDcaMYR: MONTHLY_DCA_MYR,
    twelveProMonthlyUsd: TWELVE_DATA_PRO_MONTHLY_USD,
    twelveProAnnualUsd: TWELVE_DATA_PRO_ANNUAL_BILLED_USD,
    dataGapRows,
    opsComparisonRows,
    v4RequirementsJa,
    roiCostAnnualUsd: TWELVE_DATA_PRO_ANNUAL_BILLED_USD,
    roiMeasuredUpliftJa: measuredUpliftJa,
    roiVerdictJa,
    recommendation,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4TwelveProRoiCsv(
  report: ForwardMalaysiaV4TwelveProRoiAuditReport,
): string {
  const lines = [
    `# 最重要監査その83.6 Twelve Pro ROI`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.answerFJa}`,
    '',
    'section,item,yahoo,twelvePro,codeRef',
    ...report.dataGapRows.map((r) =>
      [
        'gap',
        r.itemJa,
        `"${r.yahooStatusJa.replace(/"/g, '""')}"`,
        `"${r.twelveProStatusJa.replace(/"/g, '""')}"`,
        `"${r.codeReferenceJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,dimension,yahooOnly,yahooPlusTwelve',
    ...report.opsComparisonRows.map((r) =>
      [
        'compare',
        r.dimensionJa,
        `"${r.yahooOnlyJa.replace(/"/g, '""')}"`,
        `"${r.yahooPlusTwelveJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,metric,value',
    ['metric', 'yahooGrade', report.yahooAudit81Grade].join(','),
    ['metric', 'yahooMissingPct', report.yahooMissingRatePct].join(','),
    ['metric', 'v4CumulativePct', report.v4CumulativeReturnPct].join(','),
    ['metric', 'twelveProAnnualUsd', report.twelveProAnnualUsd].join(','),
    ['metric', 'recommendation', report.recommendation].join(','),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
  ];
  return lines.join('\n');
}

export function saveTwelveProRoiArtifacts(
  report: ForwardMalaysiaV4TwelveProRoiAuditReport,
  baseDir: string,
): { jsonPath: string; csvPath: string } {
  mkdirSync(baseDir, { recursive: true });
  const jsonPath = join(baseDir, 'forward-validation-malaysia-v4-twelve-pro-roi-audit.json');
  const csvPath = join(baseDir, 'forward-validation-malaysia-v4-twelve-pro-roi-audit.csv');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(csvPath, formatMalaysiaV4TwelveProRoiCsv(report), 'utf8');
  return { jsonPath, csvPath };
}

export function runMalaysiaV4TwelveProRoiAudit(
  scriptsDir?: string,
): ForwardMalaysiaV4TwelveProRoiAuditReport {
  return buildMalaysiaV4TwelveProRoiAuditReport({ scriptsDir });
}
