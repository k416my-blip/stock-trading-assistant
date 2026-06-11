/**
 * Phase22.2 Conviction Intelligence 監査
 * npx tsx scripts/bursa-phase22-2-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_CONVICTION_STOCKS } from '../src/constants/bursaConvictionIntelligence';
import { rankConvictionAnalyses } from '../src/services/bursa/bursaConvictionIntelligenceService';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import { enrichStockWithEarningsCall } from '../src/services/bursa/bursaPhase13Analysis';
import { enrichStockWithAnalystConsensus } from '../src/services/bursa/bursaPhase14Analysis';
import { enrichStockWithFairValueIntelligence } from '../src/services/bursa/bursaPhase21Analysis';
import { enrichStockWithAnalystTargetIntelligence } from '../src/services/bursa/bursaPhase22Analysis';
import { enrichStockWithValuationGapIntelligence } from '../src/services/bursa/bursaPhase22_1Analysis';
import { enrichStockWithConvictionIntelligence } from '../src/services/bursa/bursaPhase22_2Analysis';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE22_2_CONVICTION_INTELLIGENCE_REPORT.md');

type AuditRow = {
  code: string;
  label: string;
  fairValue: string;
  analystTarget: string;
  coverage: string;
  trend: string;
  fvConfidence: string;
  dcfUsed: string;
  ddmUsed: string;
  gapPct: string;
  trustedSource: string;
  convictionLevel: string;
  confidence: string;
  score: number;
  reason1: string;
  status: '成功' | '失敗';
  error: string | null;
};

function gitShortCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function readEnvKey(names: readonly string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function loadAuditApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: readEnvKey(['NEWS_API_KEY', 'EXPO_PUBLIC_NEWS_API_KEY']),
    snsApiKey: '',
    earningsApiKey: readEnvKey(['FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY']),
    redditApiKey: '',
    xApiKey: '',
    alphaVantageApiKey: readEnvKey(['ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY']),
    fmpApiKey: readEnvKey(['FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY']),
  };
}

function minimalStock(code: string, companyName: string): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName,
    materialScore: 0,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['', '', ''],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'skipped',
      bursa_announcement: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

async function auditOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<AuditRow> {
  try {
    const [page, bundle] = await Promise.all([
      fetchKlseStockPageHtml(code),
      fetchBursaDisclosureBundle(code),
    ]);
    const stockHtml = page?.html ?? null;

    let base = minimalStock(code, label);
    base = await enrichStockWithDividendIntelligence({ stock: base, stockHtml, bundle, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithNewsIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithMacroIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
    base = await enrichStockWithSectorRotationIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
    base = await enrichStockWithEarningsCall({ stock: base, bundle, stockHtml, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithAnalystConsensus({ stock: base, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithValuationIntelligence({ stock: base, sector, fetchLiveExternal: true });
    base = await enrichStockWithFairValueIntelligence({ stock: base, sector, fetchLiveExternal: true, bursaBundle: bundle });
    base = await enrichStockWithAnalystTargetIntelligence({ stock: base, fetchLiveExternal: true });
    base = enrichStockWithValuationGapIntelligence({ stock: base });
    const enriched = enrichStockWithConvictionIntelligence({ stock: base });

    const c = enriched.convictionIntelligence;
    const d = c?.displayJa;
    const ok = Boolean(c?.hasExtractableData);

    return {
      code,
      label,
      fairValue: d?.fairValue ?? '未取得',
      analystTarget: d?.analystTarget ?? '未取得',
      coverage: d?.coverageCount ?? '未取得',
      trend: d?.analystTrend ?? '未取得',
      fvConfidence: d?.valuationConfidence ?? '未取得',
      dcfUsed: d?.dcfUsed ?? 'No',
      ddmUsed: d?.ddmUsed ?? 'No',
      gapPct: d?.gapPct ?? '未取得',
      trustedSource: d?.trustedSource ?? '判定不可',
      convictionLevel: d?.convictionLevel ?? 'Hold',
      confidence: d?.convictionConfidence ?? 'Low',
      score: c?.convictionScore ?? 0,
      reason1: d?.reasonLine1 ?? '—',
      status: ok ? '成功' : '失敗',
      error: ok ? null : c?.availabilityLabelJa ?? '算出不可',
    };
  } catch (e) {
    return {
      code,
      label,
      fairValue: '未取得',
      analystTarget: '未取得',
      coverage: '未取得',
      trend: '未取得',
      fvConfidence: '未取得',
      dcfUsed: 'No',
      ddmUsed: 'No',
      gapPct: '未取得',
      trustedSource: '判定不可',
      convictionLevel: 'Hold',
      confidence: 'Low',
      score: 0,
      reason1: '—',
      status: '失敗',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const stocks: BursaStockMaterialAnalysis[] = [];
  const rows: AuditRow[] = [];

  for (const s of AUDIT_CONVICTION_STOCKS) {
    console.log(`[p22.2] auditing ${s.code} ${s.label}...`);
    const row = await auditOne(s.code, s.label, s.sector, apiKeys, globalMacro);
    rows.push(row);
    stocks.push({
      ...minimalStock(s.code, s.label),
      convictionIntelligence: row.status === '成功'
        ? {
            convictionScore: row.score,
            convictionLevel: row.convictionLevel.split('（')[0] as never,
            convictionConfidence: row.confidence as never,
            trustedSource: row.trustedSource.includes('Analyst')
              ? 'Analyst Target'
              : row.trustedSource.includes('Fair Value')
                ? 'Fair Value'
                : 'Blended',
          } as never
        : null,
    });
  }

  const ranked = rankConvictionAnalyses(
    rows
      .filter((r) => r.status === '成功')
      .map((r) => ({
        stockCode: r.code,
        convictionIntelligence: {
          convictionScore: r.score,
          convictionLevel: r.convictionLevel.split('（')[0],
          convictionConfidence: r.confidence,
          trustedSource: r.trustedSource.includes('Analyst')
            ? 'Analyst Target'
            : r.trustedSource.includes('Fair Value')
              ? 'Fair Value'
              : 'Blended',
        } as never,
      })),
  );

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount === 6;
  const now = new Date().toISOString();

  const lines: string[] = [
    '# Phase22.2 Conviction Intelligence 監査レポート',
    '',
    '## 実施日時',
    now,
    '',
    '## Commit Hash',
    commit,
    '',
    '## 1. 6銘柄結果',
    '',
    '| 銘柄 | 名称 | Fair Value | Analyst | Coverage | Trend | FV Conf | DCF | DDM | Gap | 信頼 | Conviction | Confidence | Score | 状態 |',
    '|------|------|------------|---------|----------|-------|---------|-----|-----|-----|------|------------|------------|-------|------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.fairValue} | ${r.analystTarget} | ${r.coverage} | ${r.trend} | ${r.fvConfidence} | ${r.dcfUsed} | ${r.ddmUsed} | ${r.gapPct} | ${r.trustedSource} | ${r.convictionLevel} | ${r.confidence} | ${r.score >= 0 ? '+' : ''}${r.score} | ${r.status} |`,
    ),
    '',
    '## 2. 理由（3行要約 · 1行目）',
    '',
    ...rows.map((r) => `- **${r.code} ${r.label}:** ${r.reason1}`),
    '',
    '## 3. Convictionランキング（Score降順）',
    '',
    '| 順位 | 銘柄 | Score | Level | Confidence | 信頼ソース |',
    '|------|------|-------|-------|------------|------------|',
    ...ranked.map((r, i) => {
      const row = rows.find((x) => x.code === r.stockCode);
      return `| ${i + 1} | ${r.stockCode} | ${r.score >= 0 ? '+' : ''}${r.score} | ${r.level} | ${r.confidence} | ${row?.trustedSource ?? '—'} |`;
    }),
    '',
    '## 4. PASS/FAIL',
    `**${pass ? 'PASS' : 'FAIL'}** — 6銘柄中 ${successCount} 銘柄で Conviction 算出成功`,
    '',
    '## エラー詳細',
    ...rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`),
    ...(rows.every((r) => !r.error) ? ['- なし'] : []),
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`PASS/FAIL: ${pass ? 'PASS' : 'FAIL'}`);
  console.log('\nConviction Ranking TOP6:');
  for (const [i, r] of ranked.entries()) {
    const row = rows.find((x) => x.code === r.stockCode);
    console.log(
      `  ${i + 1}. ${r.stockCode} ${row?.label ?? ''}: Score ${r.score >= 0 ? '+' : ''}${r.score} · ${r.level} · ${r.confidence} · ${row?.trustedSource ?? ''}`,
    );
  }
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
