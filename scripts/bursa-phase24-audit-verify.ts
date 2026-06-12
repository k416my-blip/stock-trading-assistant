/**
 * Phase24 Analyst Consensus Intelligence 監査（Step 3: mock / offline のみ）
 * npx tsx scripts/bursa-phase24-audit-verify.ts
 *
 * 外部 API 接続禁止 — useMockFixture=true のみ
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_ANALYST_CONSENSUS_STOCKS } from '../src/constants/bursaAnalystConsensusIntelligence';
import { enrichStockWithAnalystConsensusIntelligence } from '../src/services/bursa/bursaPhase24Analysis';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(
  process.cwd(),
  'docs/review/PHASE24_ANALYST_CONSENSUS_INTELLIGENCE_AUDIT_SKELETON.md',
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

async function auditOne(code: string, label: string): Promise<AuditRow> {
  try {
    const enriched = await enrichStockWithAnalystConsensusIntelligence({
      stock: minimalStock(code, label),
      useMockFixture: code === '1155',
      fetchLiveExternal: false,
    });
    const ac = enriched.analystConsensusIntelligence;
    const d = ac?.displayJa;
    const ok = ac?.availability === 'available' && ac.hasExtractableData;

    return {
      code,
      label,
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
      status: ok ? '成功' : code === '1155' ? '失敗' : '部分',
      error: null,
    };
  } catch (e) {
    return {
      code,
      label,
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
      status: '失敗',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildReport(rows: AuditRow[], commit: string): string {
  const now = new Date().toISOString();
  const mockOk = rows.find((r) => r.code === '1155')?.status === '成功';

  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.analystCount} | ${r.buyHoldSell} | ${r.consensusRating} | ${r.targetPrice} | ${r.upside} | ${r.targetRevision} | ${r.dispersion} | ${r.score} | ${r.confidence} | ${r.warnings} | ${r.source} | ${r.status} |`,
    )
    .join('\n');

  return `# Phase24 Analyst Consensus Intelligence — Audit Skeleton (Step 3)

## 実施日時
${now}

## Git Commit Hash
${commit}

## 対象 Phase
Phase24 Analyst Consensus Intelligence — **mock/offline skeleton only**

## 注意
- **外部 API 接続なし**
- 1155 のみ \`useMockFixture=true\`
- 他銘柄は Phase14 未注入のため unavailable 想定

## 6銘柄結果

| 銘柄 | 名称 | Analysts | Buy/Hold/Sell | Rating | Target | Upside | Target Rev | Dispersion | Score | Confidence | Warnings | Source | 状態 |
|------|------|----------|---------------|--------|--------|--------|------------|------------|-------|------------|----------|--------|------|
${table}

## PASS/FAIL
**${mockOk ? 'PASS (skeleton)' : 'FAIL'}** — mock fixture 1155 のみ成功想定

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
    console.log(`[Phase24 skeleton] ${code} ${row.status} score=${row.score}`);
  }
  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(rows, commit), 'utf8');
  console.log(`Report written: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
