/**
 * Phase23.1 Earnings Revision Cross Signal 検証
 * npx tsx scripts/bursa-phase23_1-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_EARNINGS_REVISION_CROSS_SIGNAL_STOCKS } from '../src/constants/bursaEarningsRevisionCrossSignal';
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
import { enrichStockWithEarningsRevisionIntelligence } from '../src/services/bursa/bursaPhase23Analysis';
import { enrichStockWithEarningsRevisionCrossSignal } from '../src/services/bursa/bursaPhase23_1Analysis';
import { enrichStockWithConvictionIntelligence } from '../src/services/bursa/bursaPhase22_2Analysis';
import { enrichStockWithInsiderTrading } from '../src/services/bursa/bursaPhase15Analysis';
import { enrichStockWithInstitutionalOwnership } from '../src/services/bursa/bursaPhase16Analysis';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE23_1_DEVICE_SMOKE_REPORT.md');
const JSON_PATH = join(process.cwd(), 'docs/review/phase23-1-verify/results.json');

const STOCK_LABELS: Record<string, string> = {
  '1155': 'Maybank',
  '1023': 'CIMB',
  '1295': 'Public Bank',
  '5347': 'Tenaga',
  '4707': 'Nestle',
  '6033': 'Petronas Gas',
};

const STOCK_SECTORS: Record<string, string> = {
  '1155': 'Financial Services',
  '1023': 'Financial Services',
  '1295': 'Financial Services',
  '5347': 'Utilities',
  '4707': 'Consumer Defensive',
  '6033': 'Energy',
};

type VerifyRow = {
  code: string;
  label: string;
  revisionDirection: string;
  insiderActivity: string;
  institutionalFlow: string;
  crossSignalDirection: string;
  crossSignalScore: number;
  alignmentCount: number;
  materialScore: number;
  crossSignalAvailable: boolean;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
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

async function verifyOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<VerifyRow> {
  try {
    const [page, bundle] = await Promise.all([
      fetchKlseStockPageHtml(code),
      fetchBursaDisclosureBundle(code),
    ]);
    const stockHtml = page?.html ?? null;

    let base = minimalStock(code, label);
    base = await enrichStockWithEarningsCall({ stock: base, stockHtml, bundle, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithAnalystConsensus({ stock: base, apiKeys, fetchLiveExternal: true });
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
    const enriched = enrichStockWithConvictionIntelligence({ stock: base });

    const cs = enriched.earningsRevisionCrossSignal;
    const crossSignalAvailable = Boolean(cs?.hasExtractableData);
    const componentCount = cs?.availableComponentCount ?? 0;

    let status: VerifyRow['status'] = 'FAIL';
    if (crossSignalAvailable) status = 'PASS';
    else if (componentCount >= 1) status = 'PARTIAL';

    return {
      code,
      label,
      revisionDirection: enriched.earningsRevisionIntelligence?.displayJa.revisionDirection ?? 'データ未取得',
      insiderActivity: enriched.insiderTrading?.netInsiderActivity ?? 'データ未取得',
      institutionalFlow: enriched.institutionalOwnership?.netInstitutionalFlow ?? 'データ未取得',
      crossSignalDirection: cs?.displayJa.crossSignalDirection ?? 'Unavailable',
      crossSignalScore: cs?.crossSignalScore ?? 0,
      alignmentCount: cs?.alignmentCount ?? 0,
      materialScore: enriched.materialScore,
      crossSignalAvailable,
      status,
      error: null,
    };
  } catch (e) {
    return {
      code,
      label,
      revisionDirection: 'データ未取得',
      insiderActivity: 'データ未取得',
      institutionalFlow: 'データ未取得',
      crossSignalDirection: 'Unavailable',
      crossSignalScore: 0,
      alignmentCount: 0,
      materialScore: 0,
      crossSignalAvailable: false,
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildReport(rows: VerifyRow[], commit: string): string {
  const now = new Date().toISOString();
  const passCount = rows.filter((r) => r.status === 'PASS').length;
  const partialCount = rows.filter((r) => r.status === 'PARTIAL').length;
  const passFail = passCount >= 4 && rows.every((r) => !r.error) ? 'PASS' : 'FAIL';

  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.revisionDirection} | ${r.insiderActivity} | ${r.institutionalFlow} | ${r.crossSignalDirection} | ${r.crossSignalScore} | ${r.alignmentCount} | ${r.materialScore} | ${r.status} |`,
    )
    .join('\n');

  return `# PHASE23_1_DEVICE_SMOKE_REPORT

## 概要
Phase23.1 Earnings Revision × Insider/Institutional Cross Signal の6銘柄 Live パイプライン検証。

- 実行日時: ${now}
- Git commit: \`${commit}\`
- 対象銘柄: 1155, 1023, 1295, 5347, 4707, 6033

## 結果サマリー
| 指標 | 値 |
|------|-----|
| PASS | ${passCount}/6 |
| PARTIAL | ${partialCount}/6 |
| FAIL | ${rows.filter((r) => r.status === 'FAIL').length}/6 |
| 判定 | **${passFail}** |

## 6銘柄 Cross Signal 結果
| Code | Label | Revision | Insider | Institutional | Cross Signal | Score | Align | MaterialScore | Status |
|------|-------|----------|---------|---------------|--------------|-------|-------|---------------|--------|
${table}

## エラー
${rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`).join('\n') || '- なし'}

## 再実行
\`\`\`bash
npx vitest run tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23_1-verify.ts
\`\`\`
`;
}

async function main(): Promise<void> {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });

  const rows: VerifyRow[] = [];
  for (const code of AUDIT_EARNINGS_REVISION_CROSS_SIGNAL_STOCKS) {
    const row = await verifyOne(
      code,
      STOCK_LABELS[code] ?? code,
      STOCK_SECTORS[code] ?? 'Unknown',
      apiKeys,
      globalMacro,
    );
    rows.push(row);
    console.log(`${code} ${row.status} ${row.crossSignalDirection} score=${row.crossSignalScore}`);
  }

  mkdirSync(join(process.cwd(), 'docs/review/phase23-1-verify'), { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify({ commit, rows }, null, 2), 'utf8');
  writeFileSync(REPORT_PATH, buildReport(rows, commit), 'utf8');
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
