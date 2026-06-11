/**
 * Phase16.7 + Phase17 監査検証（6銘柄実データ）
 * npx tsx scripts/bursa-phase16-7-phase17-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { applyHistoricalToInstitutionalTrend } from '../src/services/bursa/bursaHistoricalOwnershipService';
import { buildHistoricalOwnershipAnalysis } from '../src/services/bursa/bursaHistoricalOwnershipService';
import {
  applyFixedBasketToHistoricalOwnership,
  buildFixedInstitutionalBasketAnalysis,
} from '../src/services/bursa/bursaFixedInstitutionalBasketService';
import {
  buildDividendIntelligenceAnalysis,
  dividendIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaDividendIntelligenceService';
import { buildInstitutionalTrendAnalysis } from '../src/services/bursa/bursaInstitutionalTrendService';
import { institutionalTrendMaterialScoreAdjustment } from '../src/services/bursa/bursaInstitutionalTrendService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';

const HOLDING_CODES = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

type AuditRow = {
  code: string;
  label: string;
  status: '成功' | '失敗';
  legacy12M: string;
  fixed12M: string;
  basketTrend: string;
  pairedCount: number;
  dividendYield: string;
  dividendEval: string;
  materialScoreAdj: number;
  trendScoreAdj: number;
  error: string | null;
};

async function auditOne(code: string, label: string): Promise<AuditRow> {
  const page = await fetchKlseStockPageHtml(code);
  const stockHtml = page?.html ?? null;

  const historical = await buildHistoricalOwnershipAnalysis({
    stockCode: code,
    stockHtml,
    fetchLiveExternal: true,
  });
  const basket = await buildFixedInstitutionalBasketAnalysis({
    stockCode: code,
    stockHtml,
    legacyHistorical: historical,
    fetchLiveExternal: true,
  });
  const correctedHistorical = applyFixedBasketToHistoricalOwnership(historical, basket);
  const baseTrend = await buildInstitutionalTrendAnalysis({
    stockCode: code,
    stockHtml,
    fetchLiveExternal: true,
  });
  const mergedTrend = applyHistoricalToInstitutionalTrend(baseTrend, correctedHistorical);
  const dividend = await buildDividendIntelligenceAnalysis({
    stockCode: code,
    stockHtml,
    fetchLiveExternal: true,
  });

  const legacy12 = basket.comparisons.find((c) => c.window === '12M');
  const trendAdj = institutionalTrendMaterialScoreAdjustment(mergedTrend);
  const divAdj = dividendIntelligenceMaterialScoreAdjustment(dividend);

  const ok = basket.hasExtractableData && dividend.hasExtractableData;

  return {
    code,
    label,
    status: ok ? '成功' : '失敗',
    legacy12M:
      legacy12?.legacyTrendPct != null
        ? `${legacy12.legacyTrendPct.toFixed(1)}%`
        : historical.displayJa.twelveMonthTrend,
    fixed12M: basket.displayJa.twelveMonthTrend,
    basketTrend: basket.displayJa.trendDirection,
    pairedCount: basket.pairedInstitutionCount,
    dividendYield: dividend.displayJa.dividendYield,
    dividendEval: dividend.evaluationJa,
    materialScoreAdj: trendAdj + divAdj,
    trendScoreAdj: trendAdj,
    error: null,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  let crashCount = 0;
  const rows: AuditRow[] = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      rows.push(await auditOne(code, label));
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        legacy12M: '—',
        fixed12M: '—',
        basketTrend: '—',
        pairedCount: 0,
        dividendYield: '—',
        dividendEval: '—',
        materialScoreAdj: 0,
        trendScoreAdj: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;

  const reportLines = [
    '# Phase16.7 + Phase17 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## Phase16.7 Fixed Basket — 旧方式 vs 新方式',
    '',
    '| 銘柄 | 旧12M | 新12M(固定バスケット) | Trend | 対象機関数 |',
    '|------|-------|----------------------|-------|-----------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.legacy12M} | ${r.fixed12M} | ${r.basketTrend} | ${r.pairedCount} |`,
    ),
    '',
    '## Phase17 Dividend Intelligence',
    '',
    '| 銘柄 | 利回り | 評価 |',
    '|------|--------|------|',
    ...rows.map((r) => `| ${r.label} (${r.code}) | ${r.dividendYield} | ${r.dividendEval.slice(0, 80)} |`),
    '',
    '## 材料スコア補助（Phase16.5 Trend + Phase17 Dividend）',
    '',
    '| 銘柄 | Trend補助 | Dividend補助 | 合計補助 |',
    '|------|----------|-------------|---------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.trendScoreAdj} | ${r.materialScoreAdj - r.trendScoreAdj} | ${r.materialScoreAdj} |`,
    ),
    '',
    '## エラー',
    '',
    ...(rows.filter((r) => r.error).length > 0
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 判定: ${pass ? 'PASS' : 'FAIL'}`,
  ];

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE16_7_PHASE17_AUDIT_REPORT.md');
  writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

  console.log(JSON.stringify({ pass, successCount, crashCount, reportPath, rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
