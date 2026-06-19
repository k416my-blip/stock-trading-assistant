/**
 * Phase24 / Phase23.1 UI pipeline verify — MaterialStockRow mapping for 6 stocks
 * npx tsx scripts/bursa-phase24-23_1-ui-pipeline-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { formatMaterialAnalysisReport } from '../src/services/bursa/bursaMaterialAnalysisService';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import { enrichStockWithEarningsCall } from '../src/services/bursa/bursaPhase13Analysis';
import { enrichStockWithAnalystConsensus } from '../src/services/bursa/bursaPhase14Analysis';
import { enrichStockWithAnalystConsensusIntelligence } from '../src/services/bursa/bursaPhase24Analysis';
import { enrichStockWithFairValueIntelligence } from '../src/services/bursa/bursaPhase21Analysis';
import { enrichStockWithAnalystTargetIntelligence } from '../src/services/bursa/bursaPhase22Analysis';
import { enrichStockWithValuationGapIntelligence } from '../src/services/bursa/bursaPhase22_1Analysis';
import { enrichStockWithEarningsRevisionIntelligence } from '../src/services/bursa/bursaPhase23Analysis';
import { enrichStockWithEarningsRevisionCrossSignal } from '../src/services/bursa/bursaPhase23_1Analysis';
import { enrichStockWithConvictionIntelligence } from '../src/services/bursa/bursaPhase22_2Analysis';
import { enrichStockWithInsiderTrading } from '../src/services/bursa/bursaPhase15Analysis';
import { enrichStockWithInstitutionalOwnership } from '../src/services/bursa/bursaPhase16Analysis';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const STOCKS = ['1155', '1023', '1295', '5347', '4707', '6033'] as const;
const OUT_DIR = join(process.cwd(), 'docs/review/phase24-23_1-ui-verify');

const LABELS: Record<string, string> = {
  '1155': 'Maybank',
  '1023': 'CIMB',
  '1295': 'Public Bank',
  '5347': 'Tenaga',
  '4707': 'Nestle',
  '6033': 'Petronas Gas',
};

const SECTORS: Record<string, string> = {
  '1155': 'Financial Services',
  '1023': 'Financial Services',
  '1295': 'Financial Services',
  '5347': 'Utilities',
  '4707': 'Consumer Defensive',
  '6033': 'Energy',
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
    snsApiKey: '',
    earningsApiKey: readEnvKey('FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'),
    redditApiKey: '',
    xApiKey: '',
    alphaVantageApiKey: readEnvKey('ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY'),
    fmpApiKey: readEnvKey('FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY'),
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

type Row = {
  code: string;
  label: string;
  phase24Source: string;
  phase24Consensus: string;
  phase24Target: string;
  phase24Score: string;
  phase24Confidence: string;
  phase24UiOk: boolean;
  crossSignal: string;
  crossDirection: string;
  crossAlignment: string;
  crossScore: string;
  crossMaterialImpact: string;
  crossUiOk: boolean;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  error: string | null;
};

async function enrichFullStock(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<BursaStockMaterialAnalysis> {
  const [page, bundle] = await Promise.all([
    fetchKlseStockPageHtml(code),
    fetchBursaDisclosureBundle(code),
  ]);
  const stockHtml = page?.html ?? null;
  let base = minimalStock(code, label);
  base = await enrichStockWithEarningsCall({ stock: base, stockHtml, bundle, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithAnalystConsensus({ stock: base, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithAnalystConsensusIntelligence({
    stock: base,
    apiKeys,
    fetchLiveExternal: true,
    useMockFixture: false,
  });
  base = await enrichStockWithInsiderTrading({ stock: base, stockHtml, fetchLiveExternal: true });
  base = await enrichStockWithInstitutionalOwnership({ stock: base, stockHtml, fetchLiveExternal: true });
  base = await enrichStockWithDividendIntelligence({ stock: base, stockHtml, bundle, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithNewsIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
  base = await enrichStockWithMacroIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
  base = await enrichStockWithSectorRotationIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
  base = await enrichStockWithValuationIntelligence({ stock: base, sector, fetchLiveExternal: true });
  base = await enrichStockWithFairValueIntelligence({ stock: base, sector, fetchLiveExternal: true, bursaBundle: bundle });
  base = await enrichStockWithAnalystTargetIntelligence({ stock: base, fetchLiveExternal: true });
  base = enrichStockWithValuationGapIntelligence({ stock: base });
  base = await enrichStockWithEarningsRevisionIntelligence({ stock: base, fetchLiveExternal: true });
  base = enrichStockWithEarningsRevisionCrossSignal({ stock: base });
  return enrichStockWithConvictionIntelligence({ stock: base });
}

async function verifyOne(
  code: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<Row> {
  try {
    const enriched = await enrichFullStock(
      code,
      LABELS[code] ?? code,
      SECTORS[code] ?? 'Unknown',
      apiKeys,
      globalMacro,
    );
    const report = formatMaterialAnalysisReport({
      stocks: [enriched],
      topMaterial: enriched,
      monitoringNotifications: [],
      fetchedFields: [],
      missingFields: [],
    });
    const row = report.stocks[0]!;
    const p24 = row.analystConsensusIntelligenceDisplayJa;
    const p231 = row.earningsRevisionCrossSignalDisplayJa;
    const phase24UiOk = Boolean(
      p24 &&
        p24.source !== 'データ未取得' &&
        p24.consensusRating !== 'データ未取得' &&
        p24.targetPrice !== 'データ未取得' &&
        p24.consensusScore &&
        p24.confidence,
    );
    const crossUiOk = Boolean(
      p231 &&
        p231.crossSignalDirection &&
        p231.crossSignalScore &&
        p231.alignmentCount &&
        row.earningsRevisionCrossSignalMaterialImpactJa !== '未取得',
    );

    let status: Row['status'] = 'FAIL';
    if (phase24UiOk && crossUiOk) status = 'PASS';
    else if (phase24UiOk || crossUiOk) status = 'PARTIAL';

    return {
      code,
      label: LABELS[code] ?? code,
      phase24Source: p24?.source ?? '—',
      phase24Consensus: p24?.consensusRating ?? '—',
      phase24Target: p24?.targetPrice ?? '—',
      phase24Score: p24?.consensusScore ?? '—',
      phase24Confidence: p24?.confidence ?? '—',
      phase24UiOk,
      crossSignal: p231?.crossSignalDirection ?? '—',
      crossDirection: p231?.crossSignalDirection ?? '—',
      crossAlignment: p231?.alignmentCount ?? '—',
      crossScore: p231?.crossSignalScore ?? '—',
      crossMaterialImpact: row.earningsRevisionCrossSignalMaterialImpactJa,
      crossUiOk,
      status,
      error: null,
    };
  } catch (e) {
    return {
      code,
      label: LABELS[code] ?? code,
      phase24Source: '—',
      phase24Consensus: '—',
      phase24Target: '—',
      phase24Score: '—',
      phase24Confidence: '—',
      phase24UiOk: false,
      crossSignal: '—',
      crossDirection: '—',
      crossAlignment: '—',
      crossScore: '—',
      crossMaterialImpact: '—',
      crossUiOk: false,
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  const commit = gitShortCommit();
  const apiKeys = loadApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: Row[] = [];
  for (const code of STOCKS) {
    const row = await verifyOne(code, apiKeys, globalMacro);
    rows.push(row);
    console.log(`${code} ${row.status} p24=${row.phase24UiOk} p231=${row.crossUiOk}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'results.json'), JSON.stringify({ commit, rows }, null, 2), 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
