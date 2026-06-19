/**
 * Phase19 Live Macro Intelligence 検証
 * npx tsx scripts/bursa-phase19-live-macro-verify.ts
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import {
  buildGlobalMacroIntelligenceAnalysis,
  formatMacroDashboardRows,
  formatSectorImpactTable,
  macroIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaMacroIntelligenceService';
import { fetchMacroLiveIndicators } from '../src/services/bursa/bursaMacroLiveProviders';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const LIVE_MACRO_IDS = ['fed_rate', 'my_opr', 'us_cpi', 'my_cpi'] as const;

const HOLDING_CODES = [
  { code: '1155', label: 'Maybank', sector: 'Banking' },
  { code: '1023', label: 'CIMB', sector: 'Banking' },
  { code: '1295', label: 'Public Bank', sector: 'Banking' },
  { code: '5347', label: 'Tenaga', sector: 'Utilities' },
  { code: '4707', label: 'Nestle', sector: 'Consumer Products' },
  { code: '6033', label: 'Petronas Gas', sector: 'Energy' },
];

const IMPL_REPORT = join(process.cwd(), 'docs/review/PHASE19_LIVE_MACRO_IMPLEMENTATION_REPORT.md');
const SMOKE_REPORT = join(process.cwd(), 'docs/review/PHASE19_DEVICE_SMOKE_REPORT.md');

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
    earningsApiKey: '',
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

type StockRow = {
  code: string;
  label: string;
  sector: string;
  status: 'PASS' | 'FAIL';
  macroScore: number;
  macroSentiment: string;
  sectorImpact: number;
  sectorLabel: string;
  liveIndicators: string;
  macroAdj: number;
  error: string | null;
};

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();

  const [liveRaw, globalMacro] = await Promise.all([
    fetchMacroLiveIndicators({ forceRefresh: true, keys: apiKeys }),
    buildGlobalMacroIntelligenceAnalysis({ forceRefresh: true, apiKeys }),
  ]);

  const liveMacroResults = LIVE_MACRO_IDS.map((id) => {
    const snap = liveRaw[id];
    const pass = snap.fromLive && snap.value != null;
    return {
      id,
      pass,
      value: snap.value,
      changePct: snap.changePct,
      source: snap.source,
      fromLive: snap.fromLive,
      errorJa: snap.errorJa,
    };
  });

  const livePassCount = liveMacroResults.filter((r) => r.pass).length;
  const liveMacroPass = livePassCount === 4;

  const stockRows: StockRow[] = [];
  let crashCount = 0;

  for (const { code, label, sector } of HOLDING_CODES) {
    try {
      const enriched = await enrichStockWithMacroIntelligence({
        stock: minimalStock(code, label),
        sector,
        globalMacro,
        fetchLiveExternal: false,
      });
      const macro = enriched.macroIntelligence;
      const macroAdj = macroIntelligenceMaterialScoreAdjustment(macro ?? null);
      const ok =
        macro?.hasExtractableData === true &&
        macro.availability === 'available' &&
        macro.dashboard.indicators.length === 12 &&
        Math.abs(macro.macroScore) <= 20 &&
        Math.abs(macroAdj) <= 20 &&
        macro.sectorLabelJa !== 'データ未取得';

      stockRows.push({
        code,
        label,
        sector,
        status: ok ? 'PASS' : 'FAIL',
        macroScore: macro?.macroScore ?? 0,
        macroSentiment: macro?.macroSentiment ?? '—',
        sectorImpact: macro?.sectorImpactScore ?? 0,
        sectorLabel: macro?.sectorLabelJa ?? '—',
        liveIndicators: macro?.displayJa.liveIndicators ?? '0/12',
        macroAdj,
        error: null,
      });
    } catch (e) {
      crashCount += 1;
      stockRows.push({
        code,
        label,
        sector,
        status: 'FAIL',
        macroScore: 0,
        macroSentiment: '—',
        sectorImpact: 0,
        sectorLabel: '—',
        liveIndicators: '0/12',
        macroAdj: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const stockPassCount = stockRows.filter((r) => r.status === 'PASS').length;
  const pipelinePass = stockPassCount === 6 && crashCount === 0;

  const dashboardRows = formatMacroDashboardRows(globalMacro.dashboard);
  const sectorTable = formatSectorImpactTable(globalMacro.sectorImpacts);

  const result = {
    startedAt,
    commit,
    liveMacroPass,
    livePassCount,
    liveMacroTotal: 4,
    pipelinePass,
    stockPassCount,
    stockTotal: 6,
    crashCount,
    macroScore: globalMacro.macroScore,
    macroSentiment: globalMacro.macroSentiment,
    liveCount: globalMacro.dashboard.liveCount,
    liveMacroResults,
    stockRows,
  };

  console.log(JSON.stringify(result, null, 2));

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });

  const implReport = [
    '# PHASE19_LIVE_MACRO_IMPLEMENTATION_REPORT',
    '',
    '## 概要',
    'Phase19 Macro Intelligence — 参照定数 `MACRO_REFERENCE_VALUES` を廃止し、ライブ取得プロバイダへ置換。',
    '',
    `- 実行日時: ${startedAt}`,
    `- Git commit: \`${commit}\``,
    `- Push: pending`,
    '',
    '## 実装サマリー',
    '',
    '| 項目 | 内容 |',
    '|------|------|',
    '| ライブ指標 | fed_rate, my_opr, us_cpi, my_cpi |',
    '| 参照定数 | `MACRO_REFERENCE_VALUES` 削除 |',
    '| APIキー連携 | `loadAnalysisApiKeys()` → `buildGlobalMacroIntelligenceAnalysis({ apiKeys })` |',
    '| キャッシュ | `forceRefresh` 時 `resetMacroLiveCache()` |',
    '',
    '## カスケードソース',
    '',
    '| 指標 | 優先順 |',
    '|------|--------|',
    '| fed_rate | FRED FEDFUNDS → Alpha Vantage FEDERAL_FUNDS_RATE → FMP federalFunds |',
    '| us_cpi | FRED CPIAUCSL (YoY) → Alpha Vantage CPI → FMP CPI |',
    '| my_cpi | World Bank FP.CPI.TOTL.ZG → FRED FPCPITOTLZGMYS |',
    '| my_opr | BNM HTML parse → FMP economic calendar (MY OPR) |',
    '',
    '## Live Verify 結果',
    '',
    `| 指標 | fromLive | value | source | 判定 |`,
    `|------|----------|-------|--------|------|`,
    ...liveMacroResults.map(
      (r) =>
        `| ${r.id} | ${r.fromLive} | ${r.value ?? '—'} | ${r.source} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    ),
    '',
    `**Live macro: ${livePassCount}/4** · **Pipeline: ${stockPassCount}/6** · 判定: **${liveMacroPass && pipelinePass ? 'PASS' : 'PARTIAL/FAIL'}**`,
    '',
    '## Macro Dashboard（12指標）',
    '',
    `Macro Score: **${globalMacro.macroScore >= 0 ? '+' : ''}${globalMacro.macroScore}** (${globalMacro.macroSentiment})`,
    `Live: ${globalMacro.dashboard.liveCount}/12 · B${globalMacro.dashboard.bullishCount}/N${globalMacro.dashboard.neutralCount}/Be${globalMacro.dashboard.bearishCount}`,
    '',
    ...dashboardRows.map((line) => `- ${line}`),
    '',
    '## Sector Impact',
    '',
    sectorTable,
    '',
    '## 6銘柄パイプライン',
    '',
    '| 銘柄 | Sector | Macro | Sector Impact | Live | Status |',
    '|------|--------|-------|---------------|------|--------|',
    ...stockRows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.sectorLabel} | ${r.macroScore >= 0 ? '+' : ''}${r.macroScore} (${r.macroSentiment}) | ${r.sectorImpact >= 0 ? '+' : ''}${r.sectorImpact} | ${r.liveIndicators} | ${r.status} |`,
    ),
    '',
    '## 再実行',
    '```bash',
    'npx vitest run tests/unit/bursaMacroLiveProviders.test.ts tests/unit/bursaPhase19.test.ts',
    'npx tsx scripts/bursa-phase19-live-macro-verify.ts',
    '```',
  ].join('\n');

  writeFileSync(IMPL_REPORT, implReport, 'utf8');

  const smokeReport = [
    '# PHASE19_DEVICE_SMOKE_REPORT',
    '',
    '## 概要',
    'Phase19 Live Macro Intelligence 6銘柄パイプライン検証。',
    '',
    `- 実行日時: ${startedAt}`,
    `- Git commit: \`${commit}\``,
    `- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033`,
    '',
    '## 結果サマリー',
    '| 指標 | 値 |',
    '|------|-----|',
    `| Live macro (4指標) | ${livePassCount}/4 |`,
    `| Pipeline PASS | ${stockPassCount}/6 |`,
    `| 判定 | **${pipelinePass ? 'PASS' : 'FAIL'}** |`,
    '',
    '## Device UI',
    '**DEFERRED** — ADB device smoke not run; pipeline verified via `enrichStockWithMacroIntelligence` script path (same pattern as PHASE23_1_DEVICE_SMOKE_REPORT).',
    '',
    '## 6銘柄 Macro Pipeline 結果',
    '| Code | Label | Macro | Sector Impact | Live | Material Adj | Status |',
    '|------|-------|-------|---------------|------|--------------|--------|',
    ...stockRows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.macroScore >= 0 ? '+' : ''}${r.macroScore} (${r.macroSentiment}) | ${r.sectorImpact >= 0 ? '+' : ''}${r.sectorImpact} (${r.sectorLabel}) | ${r.liveIndicators} | ${r.macroAdj >= 0 ? '+' : ''}${r.macroAdj} | ${r.status} |`,
    ),
    '',
    '## エラー',
    ...(stockRows.some((r) => r.error)
      ? stockRows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    '## 再実行',
    '```bash',
    'npx tsx scripts/bursa-phase19-live-macro-verify.ts',
    '```',
  ].join('\n');

  writeFileSync(SMOKE_REPORT, smokeReport, 'utf8');

  if (!liveMacroPass || !pipelinePass) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
