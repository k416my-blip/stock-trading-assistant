/**
 * Phase24 Analyst Consensus Intelligence 監査（Step 4: offline mock / Phase14 派生）
 * npx tsx scripts/bursa-phase24-audit-verify.ts
 *
 * 外部 API 接続禁止
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../src/constants/bursaAnalystConsensusIntelligence';
import { buildAnalystConsensusPartialFromPhase14 } from '../src/services/bursa/bursaAnalystConsensusIntelligenceProviders';
import { enrichStockWithAnalystConsensusIntelligence } from '../src/services/bursa/bursaPhase24Analysis';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(
  process.cwd(),
  'docs/review/PHASE24_ANALYST_CONSENSUS_INTELLIGENCE_AUDIT_REPORT.md',
);

const STOCK_LABELS: Record<string, string> = {
  '1155': 'Maybank',
  '1023': 'CIMB',
  '1295': 'Public Bank',
  '5347': 'Tenaga',
  '4707': 'Nestle',
  '6033': 'Petronas Gas',
};

type AuditRow = {
  code: string;
  label: string;
  availability: string;
  analystCount: string;
  buyHoldSell: string;
  consensusRating: string;
  targetPrice: string;
  upside: string;
  targetRevision: string;
  dispersion: string;
  score: string;
  confidence: string;
  warnings: string;
  source: string;
  evaluationSnippet: string;
  status: '成功' | '部分' | '失敗';
  error: string | null;
};

function gitShortCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
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

function phase14SampleFor(code: string): BursaStockMaterialAnalysis['analystConsensus'] {
  const base = {
    availability: 'available' as const,
    availabilityLabelJa: 'Phase14 sample',
    source: 'yahoo_finance' as const,
    epsForecast: { currentFy: 1.0, nextFy: 1.1 },
    revenueForecast: { currentFy: null, nextFy: null },
    confidenceScore: 65,
    displayJa: {} as never,
    evaluationJa: '',
    hasRatingOrTarget: true,
    fetchedAt: new Date().toISOString(),
  };
  if (code === '4707') {
    return {
      ...base,
      rating: 'Hold',
      ratingCounts: { strongBuy: 0, buy: 2, hold: 5, sell: 2, strongSell: 1, analystCount: 10 },
      averageTargetPrice: 99.0,
      currentPrice: 101.5,
      targetPriceUpsidePct: -2.5,
      consensusTrend: 'Downgraded',
    };
  }
  return null;
}

async function auditOne(code: string, label: string): Promise<AuditRow> {
  try {
    const stock = minimalStock(code, label);
    const phase14 = phase14SampleFor(code);
    if (phase14) stock.analystConsensus = phase14;

    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock,
      fetchLiveExternal: false,
    });
    const ac = enriched.analystConsensusIntelligence;
    const d = ac?.displayJa;
    const ok = ac?.availability === 'available' && ac.hasExtractableData;

    return {
      code,
      label,
      availability: ac?.availability ?? 'unavailable',
      analystCount: d?.analystCount ?? '—',
      buyHoldSell: `${d?.buyCount ?? '—'}/${d?.holdCount ?? '—'}/${d?.sellCount ?? '—'}`,
      consensusRating: d?.consensusRating ?? '—',
      targetPrice: d?.targetPrice ?? '—',
      upside: d?.impliedUpsidePct ?? '—',
      targetRevision: d?.targetRevisionDirection ?? '—',
      dispersion: d?.consensusDispersion ?? '—',
      score: d?.consensusScore ?? '0',
      confidence: d?.confidence ?? 'Low',
      warnings: d?.warnings ?? '—',
      source: d?.source ?? '—',
      evaluationSnippet: (ac?.evaluationJa ?? '').slice(0, 80),
      status: ok ? '成功' : '失敗',
      error: null,
    };
  } catch (e) {
    return {
      code,
      label,
      availability: 'unavailable',
      analystCount: '—',
      buyHoldSell: '—',
      consensusRating: '—',
      targetPrice: '—',
      upside: '—',
      targetRevision: '—',
      dispersion: '—',
      score: '0',
      confidence: 'Low',
      warnings: '—',
      source: '—',
      evaluationSnippet: '',
      status: '失敗',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function summarizeWarnings(rows: AuditRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (!row.warnings || row.warnings === '—') continue;
    for (const w of row.warnings.split(',').map((s) => s.trim()).filter(Boolean)) {
      counts[w] = (counts[w] ?? 0) + 1;
    }
  }
  return counts;
}

function buildReport(rows: AuditRow[], commit: string): string {
  const now = new Date().toISOString();
  const okCount = rows.filter((r) => r.status === '成功').length;
  const pass = okCount === AUDIT_ANALYST_CONSENSUS_STOCKS.length;
  const warnSummary = summarizeWarnings(rows);
  const warnLines = Object.entries(warnSummary)
    .map(([k, v]) => `- **${k}:** ${v} 銘柄`)
    .join('\n');

  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.availability} | ${r.analystCount} | ${r.buyHoldSell} | ${r.consensusRating} | ${r.targetPrice} | ${r.upside} | ${r.targetRevision} | ${r.dispersion} | ${r.score} | ${r.confidence} | ${r.warnings} | ${r.source} | ${r.status} |`,
    )
    .join('\n');

  const phase14Check = buildAnalystConsensusPartialFromPhase14({
    availability: 'available',
    rating: 'Buy',
    ratingCounts: { strongBuy: 2, buy: 6, hold: 3, sell: 0, strongSell: 0, analystCount: 11 },
    averageTargetPrice: 10.5,
    currentPrice: 9.8,
    targetPriceUpsidePct: 7.1,
    epsForecast: { currentFy: 1, nextFy: 1.1 },
    revenueForecast: { currentFy: null, nextFy: null },
    consensusTrend: 'Upgraded',
    confidenceScore: 70,
    displayJa: {} as never,
    evaluationJa: '',
    hasRatingOrTarget: true,
    fetchedAt: new Date().toISOString(),
    availabilityLabelJa: '',
    source: 'yahoo_finance',
  });

  return `# Phase24 Analyst Consensus Intelligence — Offline Audit Report

## 実施日時
${now}

## Git Commit Hash
${commit}

## 対象 Phase
Phase24 Analyst Consensus Intelligence — **Step 4 offline audit (mock fixture · no live API)**

## 監査方針
- 6銘柄すべて mock fixture（\`fetchLiveExternal=false\`）
- 4707 のみ Phase14 派生 partial を追加注入して merge 確認
- 外部 API live fetch **なし**

## Phase14 adapter スモーク
- partial 構築: ${phase14Check ? 'OK' : 'FAIL'}
- source: ${phase14Check?.source ?? '—'}
- analystCount: ${phase14Check?.analystCount ?? '—'}

## 6銘柄結果

| 銘柄 | 名称 | Availability | Analysts | Buy/Hold/Sell | Rating | Target | Upside | Target Rev | Dispersion | Score | Confidence | Warnings | Source | 状態 |
|------|------|--------------|----------|---------------|--------|--------|--------|------------|------------|-------|------------|----------|--------|------|
${table}

## Warnings 集計
${warnLines || '- なし'}

## 評価スニペット
${rows.map((r) => `- **${r.code}:** ${r.evaluationSnippet || '—'}`).join('\n')}

## PASS/FAIL
**${pass ? 'PASS' : 'FAIL'}** — ${okCount}/${AUDIT_ANALYST_CONSENSUS_STOCKS.length} 銘柄 available

## 再実行
\`\`\`bash
npx vitest run tests/unit/bursaPhase24.test.ts
npx tsx scripts/bursa-phase24-audit-verify.ts
\`\`\`
`;
}

async function main(): Promise<void> {
  const commit = gitShortCommit();
  const rows: AuditRow[] = [];
  for (const code of AUDIT_ANALYST_CONSENSUS_STOCKS) {
    const row = await auditOne(code, STOCK_LABELS[code] ?? code);
    rows.push(row);
    console.log(
      `[Phase24 audit] ${code} ${row.status} avail=${row.availability} score=${row.score} conf=${row.confidence}`,
    );
  }
  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(rows, commit), 'utf8');
  console.log(`Report written: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
