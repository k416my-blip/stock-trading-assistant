/**
 * Phase24 — 6銘柄 実機 Live verify（材料分析パイプライン経由）
 * npx tsx scripts/bursa-phase24-device-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { enrichStockWithAnalystConsensusIntelligence } from '../src/services/bursa/bursaPhase24Analysis';
import { enrichStockWithAnalystConsensus } from '../src/services/bursa/bursaPhase14Analysis';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../src/constants/bursaAnalystConsensusIntelligence';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE24_DEVICE_SMOKE_REPORT.md');
const OUT_DIR = join(process.cwd(), 'docs/review/phase24-device-smoke');

const STOCK_LABELS: Record<string, string> = {
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
    if (v && v.length >= 8) return v;
  }
  return '';
}

function loadApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: readEnvKey('EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'),
    snsApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER'),
    earningsApiKey: readEnvKey('FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'),
    redditApiKey: readEnvKey('REDDIT_API_KEY'),
    xApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER'),
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
  phase14Source: string;
  phase24Source: string;
  availability: string;
  score: string;
  confidence: string;
  mockUsed: boolean;
  status: 'PASS' | 'FAIL';
  error: string | null;
};

async function verifyOne(code: string, label: string, apiKeys: AnalysisApiKeys): Promise<Row> {
  try {
    let stock = minimalStock(code, label);
    stock = await enrichStockWithAnalystConsensus({
      stock,
      apiKeys,
      fetchLiveExternal: true,
    });
    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock,
      apiKeys,
      fetchLiveExternal: true,
      useMockFixture: false,
    });
    const ac = enriched.analystConsensusIntelligence;
    const ok =
      ac?.availability === 'available' &&
      ac.hasExtractableData &&
      ac.source !== 'mock_fixture';
    return {
      code,
      label,
      phase14Source: enriched.analystConsensus?.source ?? 'none',
      phase24Source: ac?.source ?? 'none',
      availability: ac?.availability ?? 'unavailable',
      score: ac?.displayJa.consensusScore ?? '0',
      confidence: ac?.displayJa.confidence ?? 'Low',
      mockUsed: ac?.source === 'mock_fixture',
      status: ok ? 'PASS' : 'FAIL',
      error: null,
    };
  } catch (e) {
    return {
      code,
      label,
      phase14Source: '—',
      phase24Source: '—',
      availability: 'unavailable',
      score: '0',
      confidence: 'Low',
      mockUsed: false,
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const apiKeys = loadApiKeys();
  const commit = gitShortCommit();
  const rows: Row[] = [];
  for (const code of AUDIT_ANALYST_CONSENSUS_STOCKS) {
    const row = await verifyOne(code, STOCK_LABELS[code] ?? code, apiKeys);
    rows.push(row);
    console.log(`[Phase24 device] ${code} ${row.status} p24=${row.phase24Source}`);
  }
  const pass = rows.filter((r) => r.status === 'PASS').length;
  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.phase14Source} | ${r.phase24Source} | ${r.availability} | ${r.score} | ${r.confidence} | ${r.mockUsed ? 'Y' : 'N'} | ${r.status} |`,
    )
    .join('\n');
  const report = `# Phase24 Device Smoke Report

**Date:** ${new Date().toISOString()}
**Commit:** ${commit}
**Mode:** Live API (\`fetchLiveExternal=true\`, \`useMockFixture=false\`)

## Verdict: **${pass === rows.length ? 'PASS' : 'PARTIAL/FAIL'}** (${pass}/${rows.length})

| Code | Name | Phase14 | Phase24 | Avail | Score | Conf | Mock | Status |
|------|------|---------|---------|-------|-------|------|------|--------|
${table}

## Notes

- Validates Phase14 → Phase24 pipeline (same as material analysis)
- Mock must **not** be used (\`mockUsed=N\` for PASS)
- Device UI verification: open Material Analysis tab for each holding

## Re-run

\`\`\`bash
npx tsx scripts/bursa-phase24-device-verify.ts
\`\`\`
`;
  writeFileSync(REPORT_PATH, report, 'utf8');
  writeFileSync(join(OUT_DIR, 'results.json'), JSON.stringify(rows, null, 2), 'utf8');
  console.log(`Report: ${REPORT_PATH}`);
  if (pass < rows.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
