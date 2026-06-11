/**
 * Phase19 Macro Intelligence 監査検証
 * npx tsx scripts/bursa-phase19-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  buildGlobalMacroIntelligenceAnalysis,
  formatMacroDashboardRows,
  formatSectorImpactTable,
  macroIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const HOLDING_CODES = [
  { code: '1155', label: 'Maybank', sector: 'Banking' },
  { code: '1023', label: 'CIMB', sector: 'Banking' },
  { code: '1295', label: 'Public Bank', sector: 'Banking' },
  { code: '5347', label: 'Tenaga', sector: 'Utilities' },
  { code: '4707', label: 'Nestle', sector: 'Consumer Products' },
  { code: '6033', label: 'Petronas Gas', sector: 'Energy' },
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
      x_api: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

type AuditRow = {
  code: string;
  label: string;
  sector: string;
  status: '成功' | '失敗';
  macroScore: number;
  macroSentiment: string;
  sectorImpact: number;
  sectorSentiment: string;
  sectorLabel: string;
  liveIndicators: string;
  fieldRate: string;
  macroAdj: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<AuditRow> {
  const page = await fetchKlseStockPageHtml(code);
  const stockHtml = page?.html ?? null;

  let base = minimalStock(code, label);
  base = await enrichStockWithDividendIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  base = await enrichStockWithNewsIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const scoreBefore = base.materialScore;

  const enriched = await enrichStockWithMacroIntelligence({
    stock: base,
    sector,
    globalMacro,
    fetchLiveExternal: true,
  });

  const macro = enriched.macroIntelligence;
  const macroAdj = macroIntelligenceMaterialScoreAdjustment(macro ?? null);
  const scoreAfter = enriched.materialScore;

  const ok =
    macro?.hasExtractableData === true &&
    macro.availability === 'available' &&
    macro.dashboard.indicators.length === 12 &&
    Math.abs(macro.macroScore) <= 20 &&
    Math.abs(macroAdj) <= 20 &&
    macro.sectorLabelJa !== 'データ未取得';

  return {
    code,
    label,
    sector,
    status: ok ? '成功' : '失敗',
    macroScore: macro?.macroScore ?? 0,
    macroSentiment: macro?.macroSentiment ?? '—',
    sectorImpact: macro?.sectorImpactScore ?? 0,
    sectorSentiment: macro?.sectorImpactSentiment ?? '—',
    sectorLabel: macro?.sectorLabelJa ?? '—',
    liveIndicators: macro?.displayJa.liveIndicators ?? '0/12',
    fieldRate: `${macro?.fieldAcquisitionRate ?? 0}%`,
    macroAdj,
    scoreBefore,
    scoreAfter,
    scoreDelta: scoreAfter - scoreBefore,
    error: null,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];

  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ forceRefresh: true });
  const dashboardRows = formatMacroDashboardRows(globalMacro.dashboard);
  const sectorTable = formatSectorImpactTable(globalMacro.sectorImpacts);

  for (const { code, label, sector } of HOLDING_CODES) {
    try {
      rows.push(await auditOne(code, label, sector, apiKeys, globalMacro));
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        sector,
        status: '失敗',
        macroScore: 0,
        macroSentiment: '—',
        sectorImpact: 0,
        sectorSentiment: '—',
        sectorLabel: '—',
        liveIndicators: '0/12',
        fieldRate: '0%',
        macroAdj: 0,
        scoreBefore: 0,
        scoreAfter: 0,
        scoreDelta: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;
  const avgFieldRate =
    rows.reduce((s, r) => s + Number.parseFloat(r.fieldRate) || 0, 0) / rows.length;

  const report = [
    '# Phase19 Macro Intelligence 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Macro Dashboard（12指標）',
    '',
    `Macro Score: **${globalMacro.macroScore >= 0 ? '+' : ''}${globalMacro.macroScore}** (${globalMacro.macroSentiment})`,
  `Live: ${globalMacro.dashboard.liveCount}/12 · B${globalMacro.dashboard.bullishCount}/N${globalMacro.dashboard.neutralCount}/Be${globalMacro.dashboard.bearishCount}`,
    '',
    '| 指標 | 値 | 変化 | 評価 |',
    '|------|-----|------|------|',
    ...globalMacro.dashboard.indicators.map((i) => {
      const val = i.value != null ? `${i.value.toFixed(2)}${i.unitJa}` : '—';
      const chg =
        i.changePct != null ? `${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%` : '—';
      return `| ${i.labelJa} | ${val} | ${chg} | ${i.sentiment}${i.fromLive ? '' : ' (参照)'} |`;
    }),
    '',
    '### Dashboard Detail',
    '',
    ...dashboardRows.map((line) => `- ${line}`),
    '',
    '## 2. Macro Score',
    '',
    `スコア範囲: -20 〜 +20 · 実測: **${globalMacro.macroScore}**`,
    '',
    '## 3. Sector Impact（5セクター）',
    '',
    sectorTable,
    '',
    '| セクター | Impact | Sentiment |',
    '|----------|--------|-----------|',
    ...globalMacro.sectorImpacts.map(
      (s) =>
        `| ${s.labelJa} | ${s.impactScore >= 0 ? '+' : ''}${s.impactScore} | ${s.sentiment} |`,
    ),
    '',
    '## 4. 6銘柄ライブ結果',
    '',
    '| 銘柄 | セクター | Macro | Sector Impact | 補助 | Live |',
    '|------|----------|-------|---------------|------|------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.sectorLabel} | ${r.macroScore >= 0 ? '+' : ''}${r.macroScore} (${r.macroSentiment}) | ${r.sectorImpact >= 0 ? '+' : ''}${r.sectorImpact} (${r.sectorSentiment}) | ${r.macroAdj >= 0 ? '+' : ''}${r.macroAdj} | ${r.liveIndicators} |`,
    ),
    '',
    '## 5. AIスコア変化（Phase19追加前後）',
    '',
    '| 銘柄 | 変更前 | 変更後 | Δ |',
    '|------|--------|--------|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.scoreBefore} | ${r.scoreAfter} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} |`,
    ),
    '',
    '## 6. エラー',
    '',
    ...(rows.some((r) => r.error)
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 7. 判定: ${pass ? 'PASS' : 'FAIL'}`,
    '',
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Macro/Sector補助±20以内、12指標ダッシュボード構築。',
    '',
    `平均ライブ取得率: ${avgFieldRate.toFixed(0)}%`,
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE19_MACRO_INTELLIGENCE_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      {
        pass,
        successCount,
        crashCount,
        macroScore: globalMacro.macroScore,
        liveCount: globalMacro.dashboard.liveCount,
        reportPath,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
