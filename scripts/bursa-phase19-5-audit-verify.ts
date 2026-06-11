/**
 * Phase19.5 Sector Rotation Intelligence 監査検証
 * npx tsx scripts/bursa-phase19-5-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import {
  buildGlobalSectorRotationAnalysis,
  formatSectorRankingTable,
  sectorRotationMaterialScoreAdjustment,
} from '../src/services/bursa/bursaSectorRotationEngine';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
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
  rotationScore: number;
  miScore: number;
  sectorRank: number;
  top3: string;
  bottom3: string;
  rotationAdj: number;
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
  base = await enrichStockWithDividendIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithNewsIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithMacroIntelligence({
    stock: base,
    sector,
    globalMacro,
    fetchLiveExternal: true,
  });
  const scoreBefore = base.materialScore;

  const enriched = await enrichStockWithSectorRotationIntelligence({
    stock: base,
    sector,
    globalMacro,
    fetchLiveExternal: true,
  });

  const rotation = enriched.sectorRotation;
  const rotationAdj = sectorRotationMaterialScoreAdjustment(rotation ?? null);
  const scoreAfter = enriched.materialScore;

  const ok =
    rotation?.hasExtractableData === true &&
    rotation.availability === 'available' &&
    rotation.rankings.length === 9 &&
    rotation.top3Sectors.length === 3 &&
    rotation.bottom3Sectors.length === 3 &&
    Math.abs(rotation.sectorRotationScore) <= 20 &&
    Math.abs(rotation.macroIntelligenceScore) <= 40 &&
    Math.abs(rotationAdj) <= 20 &&
    rotation.macroIntelligenceScore === rotation.macroScore + rotation.sectorRotationScore;

  return {
    code,
    label,
    sector,
    status: ok ? '成功' : '失敗',
    macroScore: rotation?.macroScore ?? 0,
    rotationScore: rotation?.sectorRotationScore ?? 0,
    miScore: rotation?.macroIntelligenceScore ?? 0,
    sectorRank: rotation?.rankings.find((r) => r.sectorId === rotation.stockSectorId)?.rank ?? 0,
    top3: rotation?.displayJa.top3Sectors ?? '—',
    bottom3: rotation?.displayJa.bottom3Sectors ?? '—',
    rotationAdj,
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
  const globalRotation = buildGlobalSectorRotationAnalysis({
    dashboard: globalMacro.dashboard,
    macroScore: globalMacro.macroScore,
    hasExtractableData: globalMacro.hasExtractableData,
  });

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
        rotationScore: 0,
        miScore: 0,
        sectorRank: 0,
        top3: '—',
        bottom3: '—',
        rotationAdj: 0,
        scoreBefore: 0,
        scoreAfter: 0,
        scoreDelta: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;
  const dist = globalRotation.scoreDistribution;

  const report = [
    '# Phase19.5 Sector Rotation Intelligence 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Sector Ranking（9セクター）',
    '',
    formatSectorRankingTable(globalRotation.rankings),
    '',
    '| Rank | Sector | Strength | Sentiment |',
    '|------|--------|----------|-----------|',
    ...globalRotation.rankings.map(
      (r) => `| #${r.rank} | ${r.labelJa} | ${r.strength >= 0 ? '+' : ''}${r.strength} | ${r.sentiment} |`,
    ),
    '',
    '### Top 3 Sector',
    '',
    ...globalRotation.top3Sectors.map((s) => `- #${s.rank} **${s.labelJa}** (${s.strength >= 0 ? '+' : ''}${s.strength})`),
    '',
    '### Bottom 3 Sector',
    '',
    ...globalRotation.bottom3Sectors.map((s) => `- #${s.rank} **${s.labelJa}** (${s.strength >= 0 ? '+' : ''}${s.strength})`),
    '',
    '## 2. Score Distribution',
    '',
    `| 指標 | 値 |`,
    `|------|-----|`,
    `| Bullish sectors | ${dist.bullish} |`,
    `| Neutral sectors | ${dist.neutral} |`,
    `| Bearish sectors | ${dist.bearish} |`,
    `| Min / Max / Avg | ${dist.min} / ${dist.max} / ${dist.avg} |`,
  `| Macro Score (Phase19) | ${globalMacro.macroScore >= 0 ? '+' : ''}${globalMacro.macroScore} |`,
    '',
    '算出要素: Fed Rate · US10Y · USD/MYR · DXY · Oil · Gold · KLCI · S&P500 · NASDAQ',
    '',
    '## 3. 6銘柄影響',
    '',
    '| 銘柄 | Macro | Rotation | MI Score | Rank | 補助 |',
    '|------|-------|----------|----------|------|------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.macroScore >= 0 ? '+' : ''}${r.macroScore} | ${r.rotationScore >= 0 ? '+' : ''}${r.rotationScore} | ${r.miScore >= 0 ? '+' : ''}${r.miScore} | #${r.sectorRank} | ${r.rotationAdj >= 0 ? '+' : ''}${r.rotationAdj} |`,
    ),
    '',
    '## 4. AIスコア変化（Phase19.5追加前後）',
    '',
    'Macro Score + Sector Rotation Score = Macro Intelligence Score（材料補正はMIを±20にクランプ）',
    '',
    '| 銘柄 | 変更前 | 変更後 | Δ | Top3 |',
    '|------|--------|--------|---|------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.scoreBefore} | ${r.scoreAfter} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} | ${r.top3.slice(0, 40)} |`,
    ),
    '',
    '## 5. エラー',
    '',
    ...(rows.some((r) => r.error)
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 6. 判定: ${pass ? 'PASS' : 'FAIL'}`,
    '',
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、9セクターランキング構築、MI=Macro+Rotation、補正±20以内。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE19_5_SECTOR_ROTATION_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      {
        pass,
        successCount,
        crashCount,
        macroScore: globalMacro.macroScore,
        top3: globalRotation.top3Sectors.map((s) => s.labelJa),
        bottom3: globalRotation.bottom3Sectors.map((s) => s.labelJa),
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
