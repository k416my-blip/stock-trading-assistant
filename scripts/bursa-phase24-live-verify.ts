/**
 * Phase24 Analyst Consensus Intelligence — Live API verify (6 stocks)
 * npx tsx scripts/bursa-phase24-live-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../src/constants/bursaAnalystConsensusIntelligence';
import { buildAnalystConsensusAnalysis } from '../src/services/bursa/bursaAnalystConsensusService';
import { buildAnalystConsensusIntelligenceAnalysis } from '../src/services/bursa/bursaAnalystConsensusIntelligenceService';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE24_LIVE_API_IMPLEMENTATION_REPORT.md');
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

type Row = {
  code: string;
  label: string;
  phase14Source: string;
  phase24Source: string;
  availability: string;
  analystCount: string;
  rating: string;
  target: string;
  upside: string;
  score: string;
  confidence: string;
  warnings: string;
  status: 'PASS' | 'FAIL';
  error: string | null;
};

async function verifyOne(code: string, label: string, apiKeys: AnalysisApiKeys): Promise<Row> {
  try {
    const phase14 = await buildAnalystConsensusAnalysis({
      stockCode: code,
      apiKeys,
      fetchLiveExternal: true,
    });
    const phase24 = await buildAnalystConsensusIntelligenceAnalysis({
      stockCode: code,
      analystConsensus: phase14,
      apiKeys,
      fetchLiveExternal: true,
      useMockFixture: false,
    });
    const ok = phase24.availability === 'available' && phase24.hasExtractableData;
    const d = phase24.displayJa;
    return {
      code,
      label,
      phase14Source: phase14.source ?? 'none',
      phase24Source: phase24.source ?? 'none',
      availability: phase24.availability,
      analystCount: d.analystCount,
      rating: d.consensusRating,
      target: d.targetPrice,
      upside: d.impliedUpsidePct,
      score: d.consensusScore,
      confidence: d.confidence,
      warnings: d.warnings,
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
      analystCount: '—',
      rating: '—',
      target: '—',
      upside: '—',
      score: '0',
      confidence: 'Low',
      warnings: '—',
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildReport(rows: Row[], commit: string): string {
  const pass = rows.filter((r) => r.status === 'PASS').length;
  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.phase14Source} | ${r.phase24Source} | ${r.availability} | ${r.analystCount} | ${r.rating} | ${r.target} | ${r.upside} | ${r.score} | ${r.confidence} | ${r.warnings} | ${r.status} |`,
    )
    .join('\n');

  return `# Phase24 Live API Implementation Report

**Date:** ${new Date().toISOString()}
**Commit:** ${commit}
**API strategy:** Yahoo Finance (primary, no key) → Finnhub → Alpha Vantage → FMP · Phase14 merge fallback

## Result: **${pass === rows.length ? 'PASS' : 'PARTIAL'}** (${pass}/${rows.length})

| Code | Name | Phase14 | Phase24 Source | Avail | Analysts | Rating | Target | Upside | Score | Conf | Warnings | Status |
|------|------|---------|----------------|-------|----------|--------|--------|--------|-------|------|----------|--------|
${table}

## Implementation

- \`fetchLiveAnalystConsensusIntelligencePartials\` — reuses Phase14 fetchers
- \`bursaPhase24Analysis.ts\` — passes \`fetchLiveExternal\` + \`apiKeys\`
- \`bursaPhase11Analysis.ts\` — Phase24 wired after Phase14

## Re-run

\`\`\`bash
npx vitest run tests/unit/bursaPhase24.test.ts
npx tsx scripts/bursa-phase24-live-verify.ts
\`\`\`
`;
}

async function main(): Promise<void> {
  const apiKeys = loadApiKeys();
  const commit = gitShortCommit();
  const rows: Row[] = [];
  for (const code of AUDIT_ANALYST_CONSENSUS_STOCKS) {
    const row = await verifyOne(code, STOCK_LABELS[code] ?? code, apiKeys);
    rows.push(row);
    console.log(`[Phase24 live] ${code} ${row.status} source=${row.phase24Source} score=${row.score}`);
  }
  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(rows, commit), 'utf8');
  console.log(`Report: ${REPORT_PATH}`);
  if (rows.some((r) => r.status === 'FAIL')) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
