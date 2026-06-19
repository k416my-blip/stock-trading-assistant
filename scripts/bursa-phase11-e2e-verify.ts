/**
 * Phase11 Live E2E Integration — Phase13〜24 全チェーン検証
 * npx tsx scripts/bursa-phase11-e2e-verify.ts
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { analyzeOneStockForPhase11 } from '../src/services/bursa/bursaPhase11Analysis';
import {
  aggregateE2ePass,
  E2E_AUDIT_STOCK_CODES,
  summarizeStockE2e,
  type StockE2eResult,
} from '../src/services/bursa/bursaPhase11E2eValidation';
import { formatMaterialAnalysisReport } from '../src/services/bursa/bursaMaterialAnalysisService';
import { buildConciergeEnhancedAnalysis } from '../src/services/buildConciergeEnhancedAnalysis';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import { resetSharedGlobalMacroCache } from '../src/services/bursa/bursaPhase19Analysis';
import { configureRevenueRevisionSnapshotPathForTest } from '../src/services/bursa/bursaRevenueRevisionSnapshotStore';
import { buildBursaPhase9FromBundles } from '../src/services/bursa/bursaPhase9Analysis';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { ConciergeEvidenceBundle } from '../src/types/conciergeEvidence';
import type { PortfolioPosition } from '../src/types';
import type { BursaPhase11Analysis } from '../src/types/bursaDisclosure';

const LABELS: Record<string, string> = {
  '1155': 'Maybank',
  '1023': 'CIMB',
  '1295': 'Public Bank',
  '5347': 'Tenaga',
  '4707': 'Nestle',
  '6033': 'Petronas Gas',
};

function gitShortCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function readEnvKey(...names: string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function loadApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: readEnvKey('NEWS_API_KEY', 'EXPO_PUBLIC_NEWS_API_KEY'),
    snsApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER', 'SNS_API_KEY'),
    earningsApiKey: readEnvKey('FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'),
    redditApiKey: readEnvKey('REDDIT_API_KEY', 'SNS_API_KEY'),
    xApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER'),
    alphaVantageApiKey: readEnvKey('ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY'),
    fmpApiKey: readEnvKey('FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY'),
  };
}

function buildMinimalConciergeEvidence(code: string, label: string): ConciergeEvidenceBundle {
  const symbol = `${code}.KL`;
  return {
    generatedAt: new Date().toISOString(),
    analysisMode: 'balanced',
    symbols: [
      {
        symbol,
        companyName: label,
        market: 'bursa',
        displayLabelJa: `${label} (${symbol})`,
        currentPrice: 10,
        previousClose: 9.8,
        intradayChangePct: 2,
        volume: 500_000,
        volumeSurgeRatio: 1,
        quoteAgeSeconds: 120,
        quoteIsStale: false,
        portfolioHolding: {
          shares: 100,
          averageBuyPrice: 9.5,
          unrealizedPnlPct: 5,
        },
        latestFinancialNews: [],
        newsSummaryJa: 'E2E',
        newsSource: 'pipeline',
        xSentiment: null,
        trendingKeywords: [],
        unusualActivityFlags: [],
        dataGapsJa: [],
      },
    ],
    globalSummaryJa: '',
    cacheNotesJa: [],
    actionGuide: {
      generatedAt: new Date().toISOString(),
      symbols: [
        {
          symbol,
          market: 'bursa',
          displayLabelJa: `${label} (${symbol})`,
          primaryCategory: 'watch',
          categories: ['watch'],
          marketStance: 'neutral',
          marketStanceLabelJa: '中立',
          reasonBulletsJa: ['Phase11 E2E'],
          recommendedActionsJa: ['監視継続'],
          attentionPointsJa: ['次回決算'],
          riskSummaryJa: '—',
          confidencePct: 60,
          insufficientData: false,
          insufficientDataLabelJa: null,
          evidenceScores: {
            priceAction: 50,
            volume: 50,
            news: 50,
            xSentiment: 50,
            volatility: 50,
          },
          notificationPriority: 'low',
          notificationWhyJa: '',
        },
      ],
      overallConfidencePct: 60,
      overallStance: 'neutral',
      overallStanceLabelJa: '中立',
      primaryCategory: 'watch',
      aggregatedRecommendationsJa: [],
      aggregatedRisksJa: [],
      aggregatedAttentionJa: [],
    },
    riskControl: {
      generatedAt: new Date().toISOString(),
      overallConfidencePct: 60,
      overallDataQualityScore: 65,
      confidenceGateOpen: true,
      allowSpeculativeAi: true,
      allowActionRecommendations: true,
      analysisBlockedJa: null,
      globalStaleWarningJa: null,
      perSymbolWarningsJa: {},
    },
  };
}

function writeReports(input: {
  startedAt: string;
  commit: string;
  rows: StockE2eResult[];
  summary: ReturnType<typeof aggregateE2ePass>;
  fetchLiveExternal: boolean;
}): { integrationPath: string; smokePath: string } {
  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });

  const integrationPath = join(outDir, 'PHASE11_E2E_INTEGRATION_REPORT.md');
  const smokePath = join(outDir, 'PHASE11_E2E_DEVICE_SMOKE_REPORT.md');

  const passLabel = input.summary.pass ? 'PASS' : input.summary.passCount >= 4 ? 'PARTIAL PASS' : 'FAIL';

  const integration = [
    '# PHASE11_E2E_INTEGRATION_REPORT',
    '',
    '## 概要',
    'Phase11 Live E2E — Phase13〜24 全チェーン一括検証（fetchLiveExternal=true）。',
    '',
    `- 実行日時: ${input.startedAt}`,
    `- Git commit: \`${input.commit}\``,
    `- fetchLiveExternal: **${input.fetchLiveExternal}**`,
    '',
    '## 判定',
    '',
    `**${passLabel}** — ${input.summary.passCount}/6 PASS · ${input.summary.partialCount} PARTIAL · クラッシュ ${input.summary.crashCount}`,
    '',
    '## 検証項目',
    '',
    '| 項目 | 内容 |',
    '|------|------|',
    '| fetchLiveExternal | true（Live API / HTML） |',
    '| Phase13〜24 | analyzeOneStock 全 enricher 実行 |',
    '| Material Score | -100〜+100 集計 |',
    '| Concierge | buildConciergeEnhancedAnalysis 出力 |',
    '| UI Mapping | MaterialStockRow 各 Phase evaluationJa |',
    '| API Fallback | sourceStatus ok/partial/skipped 耐性 |',
    '| エラー耐性 | 銘柄単位 try/catch、全体クラッシュ0 |',
    '',
    '## 6銘柄結果',
    '',
    '| Code | Label | Status | Score | Phases Exec | Phases Data | UI Map | Concierge | API | Error |',
    '|------|-------|--------|-------|-------------|-------------|--------|-----------|-----|-------|',
    ...input.rows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.status} | ${r.materialScore.score} | ${r.phasesExecuted}/19 | ${r.phasesWithData}/19 | ${r.uiMapping.mappedPhases}/${r.uiMapping.totalPhases} | ${r.concierge.pass ? 'OK' : 'NG'} | ${r.apiFallback.pass ? 'OK' : 'NG'} | ${r.error ?? '—'} |`,
    ),
    '',
    '## Phase チェーン詳細（1155 代表）',
    '',
    ...((): string[] => {
      const ref = input.rows.find((r) => r.code === '1155') ?? input.rows[0];
      if (!ref) return ['- なし'];
      return [
        '| Phase | Executed | Data |',
        '|-------|----------|------|',
        ...ref.phaseChain.map(
          (p) => `| ${p.phaseId} | ${p.executed ? 'Y' : 'N'} | ${p.dataAvailable ? 'Y' : 'N'} |`,
        ),
      ];
    })(),
    '',
    '## 再実行',
    '',
    '```bash',
    'npx vitest run tests/unit/bursaPhase11E2e.test.ts',
    'npx tsx scripts/bursa-phase11-e2e-verify.ts',
    '```',
    '',
  ].join('\n');

  const smoke = [
    '# PHASE11_E2E_DEVICE_SMOKE_REPORT',
    '',
    '## 概要',
    'Phase11 Live E2E 6銘柄パイプラインスモーク。',
    '',
    `- 実行日時: ${input.startedAt}`,
    `- Git commit: \`${input.commit}\``,
    `- 対象銘柄: ${E2E_AUDIT_STOCK_CODES.join(', ')}`,
    '',
    '## 結果サマリー',
    '| 指標 | 値 |',
    '|------|-----|',
    `| E2E PASS | ${input.summary.passCount}/6 |`,
    `| PARTIAL | ${input.summary.partialCount}/6 |`,
    `| FAIL | ${input.summary.failCount}/6 |`,
    `| クラッシュ | ${input.summary.crashCount} |`,
    '| Device UI | **DEFERRED**（ADB 未接続 — パイプライン検証のみ） |',
    '',
    `## 判定: **${passLabel}**`,
    '',
    '## エラー',
    ...(input.rows.some((r) => r.error)
      ? input.rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    '## 再実行',
    '```bash',
    'npx tsx scripts/bursa-phase11-e2e-verify.ts',
    '```',
    '',
  ].join('\n');

  writeFileSync(integrationPath, integration, 'utf8');
  writeFileSync(smokePath, smoke, 'utf8');
  return { integrationPath, smokePath };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const commit = gitShortCommit();
  const apiKeys = loadApiKeys();
  resetSharedGlobalMacroCache();
  configureRevenueRevisionSnapshotPathForTest(
    join(tmpdir(), 'stock-trading-assistant-phase23-revenue-snapshots-e2e.json'),
  );

  const codes = [...E2E_AUDIT_STOCK_CODES];
  const stockHtmlByCode: Record<string, string> = {};
  const bundles = [];

  for (const code of codes) {
    process.stderr.write(`[phase11-e2e] prefetch ${code}\n`);
    const [page, bundle] = await Promise.all([
      fetchKlseStockPageHtml(code),
      fetchBursaDisclosureBundle(code),
    ]);
    if (page?.html) stockHtmlByCode[code] = page.html;
    bundles.push(bundle);
  }

  const holdings: PortfolioPosition[] = codes.map((code) => ({
    id: `e2e-${code}`,
    symbol: code,
    market: 'bursa',
    shares: 1000,
    currentPrice: null,
    companyName: LABELS[code] ?? code,
  }));

  let phase11: BursaPhase11Analysis;
  try {
    const phase9 = await buildBursaPhase9FromBundles({
      bundles,
      holdings,
      persistSnapshot: false,
    });
    const stocks = [];
    for (const bundle of bundles) {
      process.stderr.write(`[phase11-e2e] analyze ${bundle.stockCode}\n`);
      stocks.push(
        await analyzeOneStockForPhase11({
          bundle,
          stockHtml: stockHtmlByCode[bundle.stockCode] ?? null,
          apiKeys,
          fetchLiveExternal: true,
          phase9,
        }),
      );
    }
    phase11 = {
      stocks,
      topMaterial: stocks.length
        ? [...stocks].sort((a, b) => Math.abs(b.materialScore) - Math.abs(a.materialScore))[0] ?? null
        : null,
      monitoringNotifications: [],
      fetchedFields: ['phase11.stocks'],
      missingFields: [],
    };
  } catch (e) {
    console.error(
      JSON.stringify(
        {
          pass: false,
          crash: true,
          error: e instanceof Error ? e.message : String(e),
          commit,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const materialReport = formatMaterialAnalysisReport(phase11);
  const rows: StockE2eResult[] = [];

  for (const code of codes) {
    const label = LABELS[code] ?? code;
    try {
      const stock = phase11.stocks.find((s) => s.stockCode === code);
      const materialRow = materialReport.stocks.find((s) => s.stockCode === code);
      if (!stock || !materialRow) {
        rows.push({
          code,
          label,
          status: 'FAIL',
          crash: false,
          error: 'stock not in phase11 output',
          fetchLiveExternal: true,
          materialScore: { pass: false, score: 0, breakdownCount: 0, reason: 'missing stock' },
          phaseChain: [],
          phasesExecuted: 0,
          phasesWithData: 0,
          uiMapping: { pass: false, mappedPhases: 0, totalPhases: 19, missingUi: [] },
          concierge: {
            pass: false,
            hasEnhancedReport: false,
            hasPhase23Block: false,
            hasPhase24Block: false,
            reason: 'missing stock',
          },
          apiFallback: { pass: false, statuses: {}, hasGracefulSkip: false },
        });
        continue;
      }

      const concierge = buildConciergeEnhancedAnalysis({
        evidence: buildMinimalConciergeEvidence(code, label),
        materialRow,
      });

      rows.push(
        summarizeStockE2e({
          code,
          label,
          stock,
          materialRow,
          concierge,
          fetchLiveExternal: true,
        }),
      );
    } catch (e) {
      rows.push({
        code,
        label,
        status: 'FAIL',
        crash: true,
        error: e instanceof Error ? e.message : String(e),
        fetchLiveExternal: true,
        materialScore: { pass: false, score: 0, breakdownCount: 0, reason: 'crash' },
        phaseChain: [],
        phasesExecuted: 0,
        phasesWithData: 0,
        uiMapping: { pass: false, mappedPhases: 0, totalPhases: 19, missingUi: [] },
        concierge: {
          pass: false,
          hasEnhancedReport: false,
          hasPhase23Block: false,
          hasPhase24Block: false,
          reason: 'crash',
        },
        apiFallback: { pass: false, statuses: {}, hasGracefulSkip: false },
      });
    }
  }

  const summary = aggregateE2ePass(rows);
  const { integrationPath, smokePath } = writeReports({
    startedAt,
    commit,
    rows,
    summary,
    fetchLiveExternal: true,
  });

  console.log(
    JSON.stringify(
      {
        pass: summary.pass,
        passCount: summary.passCount,
        partialCount: summary.partialCount,
        failCount: summary.failCount,
        crashCount: summary.crashCount,
        commit,
        fetchLiveExternal: true,
        stockCount: phase11.stocks.length,
        integrationPath,
        smokePath,
        rows,
      },
      null,
      2,
    ),
  );

  if (!summary.pass && summary.passCount < 4) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
