/**
 * Phase22.1 Valuation Gap Intelligence 監査
 * npx tsx scripts/bursa-phase22-1-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_VALUATION_GAP_STOCKS } from '../src/constants/bursaValuationGapIntelligence';
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
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE22_1_VALUATION_GAP_INTELLIGENCE_REPORT.md');

type AuditRow = {
  code: string;
  label: string;
  fairValue: string;
  analystTarget: string;
  gapPct: number | null;
  gapPctDisplay: string;
  classification: string;
  gapScore: number;
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
    base = await enrichStockWithDividendIntelligence({
      stock: base,
      stockHtml,
      bundle,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithNewsIntelligence({
      stock: base,
      stockHtml,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithMacroIntelligence({
      stock: base,
      sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithSectorRotationIntelligence({
      stock: base,
      sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithEarningsCall({
      stock: base,
      bundle,
      stockHtml,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithAnalystConsensus({
      stock: base,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithValuationIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithFairValueIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
      bursaBundle: bundle,
    });
    base = await enrichStockWithAnalystTargetIntelligence({
      stock: base,
      fetchLiveExternal: true,
    });
    const enriched = enrichStockWithValuationGapIntelligence({ stock: base });

    const g = enriched.valuationGapIntelligence;
    const d = g?.displayJa;
    const ok = Boolean(g?.hasExtractableData && g.gapPct != null);

    return {
      code,
      label,
      fairValue: d?.fairValue ?? '未取得',
      analystTarget: d?.analystTarget ?? '未取得',
      gapPct: g?.gapPct ?? null,
      gapPctDisplay: d?.gapPct ?? '未取得',
      classification: d?.gapClassification ?? '分類不可',
      gapScore: g?.valuationGapScore ?? 0,
      status: ok ? '成功' : '失敗',
      error: ok ? null : g?.availabilityLabelJa ?? 'Gap算出不可',
    };
  } catch (e) {
    return {
      code,
      label,
      fairValue: '未取得',
      analystTarget: '未取得',
      gapPct: null,
      gapPctDisplay: '未取得',
      classification: '分類不可',
      gapScore: 0,
      status: '失敗',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: AuditRow[] = [];

  for (const s of AUDIT_VALUATION_GAP_STOCKS) {
    console.log(`[p22.1] auditing ${s.code} ${s.label}...`);
    rows.push(await auditOne(s.code, s.label, s.sector, apiKeys, globalMacro));
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const ranked = [...rows]
    .filter((r) => r.gapPct != null)
    .sort((a, b) => (b.gapPct ?? 0) - (a.gapPct ?? 0));
  const maxDivergence = ranked[0] ?? null;
  const consensusStocks = rows.filter((r) => r.classification.includes('Consensus'));
  const pass = successCount === 6;
  const now = new Date().toISOString();

  const lines: string[] = [
    '# Phase22.1 Valuation Gap Intelligence 監査レポート',
    '',
    '## 実施日時',
    now,
    '',
    '## Commit Hash',
    commit,
    '',
    '## 1. 6銘柄結果',
    '',
    '| 銘柄 | 名称 | Fair Value | Analyst Target | Gap % | 分類 | Gap Score | 状態 |',
    '|------|------|------------|----------------|-------|------|-----------|------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.fairValue} | ${r.analystTarget} | ${r.gapPctDisplay} | ${r.classification} | ${r.gapScore >= 0 ? '+' : ''}${r.gapScore} | ${r.status} |`,
    ),
    '',
    '## 2. Gapランキング（降順）',
    '',
    '| 順位 | 銘柄 | Gap % | 分類 |',
    '|------|------|-------|------|',
    ...ranked.map(
      (r, i) => `| ${i + 1} | ${r.code} ${r.label} | ${r.gapPctDisplay} | ${r.classification} |`,
    ),
    '',
    '## 3. 最大乖離銘柄',
    maxDivergence
      ? `- **${maxDivergence.code} ${maxDivergence.label}** — Gap ${maxDivergence.gapPctDisplay}（${maxDivergence.classification}）`
      : '- 算出不可',
    '',
    '## 4. Consensus銘柄',
    consensusStocks.length > 0
      ? consensusStocks.map((r) => `- ${r.code} ${r.label}（Gap ${r.gapPctDisplay}）`).join('\n')
      : '- 該当なし（全銘柄が ±20% 超の乖離）',
    '',
    '## 5. PASS/FAIL',
    `**${pass ? 'PASS' : 'FAIL'}** — 6銘柄中 ${successCount} 銘柄で Valuation Gap 算出成功`,
    '',
    '## エラー詳細',
    ...rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`),
    ...(rows.every((r) => !r.error) ? ['- なし'] : []),
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`PASS/FAIL: ${pass ? 'PASS' : 'FAIL'}`);
  console.log('\nGap Ranking TOP6:');
  for (const [i, r] of ranked.entries()) {
    console.log(`  ${i + 1}. ${r.code} ${r.label}: ${r.gapPctDisplay} (${r.classification})`);
  }
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
