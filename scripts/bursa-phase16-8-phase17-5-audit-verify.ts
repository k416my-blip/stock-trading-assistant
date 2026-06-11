/**
 * Phase16.8 + Phase17.5 監査検証
 * npx tsx scripts/bursa-phase16-8-phase17-5-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import { applyHistoricalToInstitutionalTrend } from '../src/services/bursa/bursaHistoricalOwnershipService';
import { buildHistoricalOwnershipAnalysis } from '../src/services/bursa/bursaHistoricalOwnershipService';
import {
  applyFixedBasketToHistoricalOwnership,
  buildFixedInstitutionalBasketAnalysis,
  computeFixedBasketWindowTrend,
} from '../src/services/bursa/bursaFixedInstitutionalBasketService';
import { buildDividendIntelligenceAnalysis } from '../src/services/bursa/bursaDividendIntelligenceService';
import {
  dividendIntelligenceMaterialScoreAdjustment,
  institutionalTrendMaterialScoreAdjustment,
} from '../src/services/bursa/bursaMaterialWeightCalibration';
import { buildInstitutionalTrendAnalysis } from '../src/services/bursa/bursaInstitutionalTrendService';
import {
  FIXED_BASKET_INSTITUTION_LABELS,
  parseInstitutionalOwnershipFromHtml,
} from '../src/services/bursa/bursaInstitutionalOwnershipParser';
import {
  fetchKlseShareholdingsHistoryHtml,
  fetchKlseStockPageHtml,
} from '../src/services/bursa/bursaKlseHtmlClient';

const HOLDING_CODES = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

function readEnvKey(names: readonly string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function loadAuditApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: '',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
    alphaVantageApiKey: readEnvKey(['ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY']),
    fmpApiKey: readEnvKey(['FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY']),
  };
}

const DIVIDEND_FIELDS = [
  'dividendYield',
  'payoutRatio',
  'fiveYearCagr',
  'exDividendDate',
  'paymentDate',
  'dividendFrequency',
  'specialDividend',
] as const;

type AuditRow = {
  code: string;
  label: string;
  status: '成功' | '失敗';
  legacy8_12M: string;
  top30_12M: string;
  top30Paired: number;
  legacy8Paired: number;
  fieldRate: string;
  yield: string;
  payout: string;
  cagr: string;
  exDate: string;
  divAdj: number;
  trendAdj: number;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  apiKeys: AnalysisApiKeys,
): Promise<AuditRow> {
  const page = await fetchKlseStockPageHtml(code);
  const stockHtml = page?.html ?? null;
  const sh = await fetchKlseShareholdingsHistoryHtml(code);
  const shareholdingsHtml = sh?.html ?? null;

  const historical = await buildHistoricalOwnershipAnalysis({
    stockCode: code,
    stockHtml,
    shareholdingsHistoryHtml: shareholdingsHtml,
    fetchLiveExternal: true,
  });
  const basket = await buildFixedInstitutionalBasketAnalysis({
    stockCode: code,
    stockHtml,
    shareholdingsHistoryHtml: shareholdingsHtml,
    legacyHistorical: historical,
    fetchLiveExternal: true,
  });
  const corrected = applyFixedBasketToHistoricalOwnership(historical, basket);
  const baseTrend = await buildInstitutionalTrendAnalysis({
    stockCode: code,
    stockHtml,
    fetchLiveExternal: true,
  });
  const mergedTrend = applyHistoricalToInstitutionalTrend(baseTrend, corrected);
  const dividend = await buildDividendIntelligenceAnalysis({
    stockCode: code,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });

  let legacy8_12M = '—';
  if (shareholdingsHtml) {
    const snaps = parseInstitutionalOwnershipFromHtml({
      stockCode: code,
      stockHtml,
      shareholdingsHtml,
    });
    const legacy = computeFixedBasketWindowTrend(
      snaps,
      new Date(),
      365,
      FIXED_BASKET_INSTITUTION_LABELS,
    );
    legacy8_12M =
      legacy.trend != null ? `${legacy.trend.toFixed(2)}%` : basket.legacy8TwelveMonthTrend != null
        ? `${basket.legacy8TwelveMonthTrend.toFixed(2)}%`
        : '—';
  }

  const filled = DIVIDEND_FIELDS.filter((f) => {
    const v = dividend[f as keyof typeof dividend];
    return v != null && v !== '';
  }).length;

  const divAdj = dividendIntelligenceMaterialScoreAdjustment(dividend);
  const trendAdj = institutionalTrendMaterialScoreAdjustment(mergedTrend, basket);

  const ok =
    basket.hasExtractableData &&
    dividend.hasExtractableData &&
    dividend.fieldAcquisitionRate >= 0.28;

  return {
    code,
    label,
    status: ok ? '成功' : '失敗',
    legacy8_12M,
    top30_12M: basket.displayJa.twelveMonthTrend,
    top30Paired: basket.pairedInstitutionCount,
    legacy8Paired: basket.legacy8PairedCount,
    fieldRate: `${Math.round(dividend.fieldAcquisitionRate * 100)}% (${filled}/7)`,
    yield: dividend.displayJa.dividendYield,
    payout: dividend.displayJa.payoutRatio,
    cagr: dividend.displayJa.fiveYearCagr,
    exDate: dividend.displayJa.exDividendDate,
    divAdj,
    trendAdj,
    error: null,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      rows.push(await auditOne(code, label, apiKeys));
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        legacy8_12M: '—',
        top30_12M: '—',
        top30Paired: 0,
        legacy8Paired: 0,
        fieldRate: '0%',
        yield: '—',
        payout: '—',
        cagr: '—',
        exDate: '—',
        divAdj: 0,
        trendAdj: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;
  const avgFieldRate =
    rows.reduce((s, r) => s + Number.parseFloat(r.fieldRate) || 0, 0) / rows.length;

  const report = [
    '# Phase16.8 + Phase17.5 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. 取得率',
    '',
    `| 指標 | 値 |`,
    `|------|-----|`,
    `| 配当7項目平均取得率 | ${avgFieldRate.toFixed(0)}% |`,
    `| TOP30バスケット平均ペア数 | ${(rows.reduce((s, r) => s + r.top30Paired, 0) / rows.length).toFixed(1)} |`,
    '',
    '## 2. 旧Phase17 vs Phase17.5（配当フィールド）',
    '',
    '| 銘柄 | 取得率 | 利回り | 配当性向 | 5YCAGR | Ex-Date |',
    '|------|--------|--------|---------|--------|---------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.fieldRate} | ${r.yield} | ${r.payout} | ${r.cagr} | ${r.exDate} |`,
    ),
    '',
    '旧Phase17: 利回り・性向は多く「未取得」、連続年数中心。',
    'Phase17.5: Yahoo→FMP→AlphaVantage→KLSE の優先マージで各フィールドを個別取得。',
    '',
    '## 3. 旧Phase16.7 vs Phase16.8（機関バスケット）',
    '',
    '| 銘柄 | 旧固定8・12M | 新TOP30・12M | 旧8ペア | 新30ペア |',
    '|------|-------------|-------------|---------|---------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.legacy8_12M} | ${r.top30_12M} | ${r.legacy8Paired} | ${r.top30Paired} |`,
    ),
    '',
    '## 4. 6銘柄ライブ結果 — 材料スコア補助（適応的重み）',
    '',
    '| 銘柄 | Trend補助 | Dividend補助 | 合計 |',
    '|------|----------|-------------|------|',
    ...rows.map(
      (r) => `| ${r.label} (${r.code}) | ${r.trendAdj} | ${r.divAdj} | ${r.trendAdj + r.divAdj} |`,
    ),
    '',
    '重み: Trend最大12・Dividend最大8を取得率/ペア数で自動スケール。',
    '',
    '## 5. エラー',
    '',
    ...(rows.some((r) => r.error)
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 6. 判定: ${pass ? 'PASS' : 'FAIL'}`,
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE16_8_PHASE17_5_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(JSON.stringify({ pass, successCount, crashCount, avgFieldRate, reportPath, rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
