/**
 * Phase23 Revenue Revision ライブ検証
 * npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadLocalEnvFiles } from './lib/safeLocalEnv.mjs';
import { AUDIT_EARNINGS_REVISION_STOCKS } from '../src/constants/bursaEarningsRevisionIntelligence';
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
import { enrichStockWithConvictionIntelligence } from '../src/services/bursa/bursaPhase22_2Analysis';
import { fetchAllRevenueRevisionPartials } from '../src/services/bursa/bursaRevenueRevisionProviders';
import { configureRevenueRevisionSnapshotPath } from '../src/services/bursa/bursaRevenueRevisionSnapshotStore';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

loadLocalEnvFiles();

const SNAPSHOT_PATH = join(
  process.cwd(),
  'docs/review/evidence/phase23-revenue-revision-snapshots.json',
);
configureRevenueRevisionSnapshotPath(SNAPSHOT_PATH);

const IMPL_REPORT = join(
  process.cwd(),
  'docs/review/PHASE23_REVENUE_COMPLETION_REPORT.md',
);
const SMOKE_REPORT = join(
  process.cwd(),
  'docs/review/PHASE23_REVENUE_DEVICE_SMOKE_REPORT.md',
);
const JSON_OUT = join(
  process.cwd(),
  'docs/review/evidence/phase23-revenue-revision-verify.json',
);

const STOCK_LABELS: Record<string, { label: string; sector: string }> = {
  '1155': { label: 'Maybank', sector: 'Banking' },
  '1023': { label: 'CIMB', sector: 'Banking' },
  '1295': { label: 'Public Bank', sector: 'Banking' },
  '5347': { label: 'Tenaga', sector: 'Utilities' },
  '4707': { label: 'Nestle', sector: 'Consumer Products' },
  '6033': { label: 'Petronas Gas', sector: 'Energy' },
};

type VerifyRow = {
  code: string;
  label: string;
  revenueRev30d: number | null;
  revenueRev30dDisplay: string;
  revenueSource: string;
  epsRev30d: string;
  revisionDirection: string;
  revisionScore: string;
  pipelineOk: boolean;
  revenueRevisionOk: boolean;
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
  meta: { label: string; sector: string },
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<VerifyRow> {
  try {
    const [page, bundle] = await Promise.all([
      fetchKlseStockPageHtml(code),
      fetchBursaDisclosureBundle(code),
    ]);

    let base = minimalStock(code, meta.label);
    base = await enrichStockWithDividendIntelligence({
      stock: base,
      stockHtml: page?.html ?? null,
      bundle,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithNewsIntelligence({
      stock: base,
      stockHtml: page?.html ?? null,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithMacroIntelligence({
      stock: base,
      sector: meta.sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithSectorRotationIntelligence({
      stock: base,
      sector: meta.sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithEarningsCall({
      stock: base,
      bundle,
      stockHtml: page?.html ?? null,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithAnalystConsensus({
      stock: base,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithValuationIntelligence({
      stock: base,
      sector: meta.sector,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithFairValueIntelligence({
      stock: base,
      sector: meta.sector,
      fetchLiveExternal: true,
      bursaBundle: bundle,
    });
    base = await enrichStockWithAnalystTargetIntelligence({
      stock: base,
      fetchLiveExternal: true,
    });
    base = enrichStockWithValuationGapIntelligence({ stock: base });
    base = await enrichStockWithEarningsRevisionIntelligence({
      stock: base,
      fetchLiveExternal: true,
      apiKeys: {
        finnhubApiKey: apiKeys.earningsApiKey,
        alphaVantageApiKey: apiKeys.alphaVantageApiKey,
        fmpApiKey: apiKeys.fmpApiKey,
      },
    });
    const enriched = enrichStockWithConvictionIntelligence({ stock: base });

    const er = enriched.earningsRevisionIntelligence;
    const d = er?.displayJa;
    const revenuePartial = await fetchAllRevenueRevisionPartials({
      stockCode: code,
      fetchLiveExternal: true,
      apiKeys: {
        finnhubApiKey: apiKeys.earningsApiKey,
        alphaVantageApiKey: apiKeys.alphaVantageApiKey,
        fmpApiKey: apiKeys.fmpApiKey,
      },
    });

    const revenueRev30d = er?.revenueRevision30d ?? null;
    const pipelineOk = Boolean(er?.hasExtractableData);
    const revenueRevisionOk = revenueRev30d != null;

    return {
      code,
      label: meta.label,
      revenueRev30d,
      revenueRev30dDisplay: d?.revenueRevision30d ?? 'データ未取得',
      revenueSource: revenuePartial?.source ?? d?.source ?? 'none',
      epsRev30d: d?.epsRevision30d ?? 'データ未取得',
      revisionDirection: d?.revisionDirection ?? 'データ未取得',
      revisionScore: d?.revisionScore ?? '0',
      pipelineOk,
      revenueRevisionOk,
      status: pipelineOk ? (revenueRevisionOk ? 'PASS' : 'PARTIAL') : 'FAIL',
      error: null,
    };
  } catch (e) {
    return {
      code,
      label: meta.label,
      revenueRev30d: null,
      revenueRev30dDisplay: 'データ未取得',
      revenueSource: 'none',
      epsRev30d: 'データ未取得',
      revisionDirection: 'データ未取得',
      revisionScore: '0',
      pipelineOk: false,
      revenueRevisionOk: false,
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildImplReport(input: {
  commit: string;
  rows: VerifyRow[];
  revenuePass: number;
  pipelinePass: number;
  apiKeyStatus: Record<string, string>;
}): string {
  const now = new Date().toISOString();
  const table = input.rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.revenueRev30dDisplay} | ${r.revenueSource} | ${r.epsRev30d} | ${r.revisionDirection} | ${r.revisionScore} | ${r.pipelineOk ? 'PASS' : 'FAIL'} | ${r.revenueRevisionOk ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n');

  return `# PHASE23_REVENUE_COMPLETION_REPORT

## 概要
Phase23 Revenue Revision — Yahoo revenueTrend 欠落時 epsTrend×revenueEstimate corridor · FMP / Finnhub / Alpha Vantage / Snapshot カスケード。

- 実行日時: ${now}
- Git commit: \`${input.commit}\`
- Push: pending

## 根本原因（0/6）

| 原因 | 詳細 |
|------|------|
| Yahoo revenueTrend | .KL 含む全銘柄で \`revenueTrend\` オブジェクト欠落（2026-06 Live 確認） |
| API キー未設定 | FMP / Finnhub / Alpha Vantage — \`.env\` に未設定 |
| スナップショット | 30 日蓄積前 — 単日観測のみ |

## 修正内容

| 項目 | 内容 |
|------|------|
| epsTrend corridor | \`revenueEstimate.avg\` + 同一 period \`epsTrend\` から 30D 修正率導出 |
| プロバイダ | \`bursaRevenueRevisionProviders.ts\` |
| Phase23.1 | EPS Stable 時 Revenue Revision bias 反映（既存） |
| fetchedFields | \`phase23.revenue_revision_series\` |

## カスケードソース

| 優先 | ソース | 備考 |
|------|--------|------|
| 1 | Yahoo earningsTrend revenueTrend | 現行 Yahoo API ではほぼ全銘柄欠落 |
| 2 | Yahoo epsTrend × revenueEstimate | **今回追加** — EPS revision パターン準拠 |
| 3 | FMP analyst-estimates | APIキー必要 · スナップショット蓄積 |
| 4 | Finnhub revenue-estimate | APIキー必要 · スナップショット蓄積 |
| 5 | Alpha Vantage EARNINGS | estimatedRevenue（銘柄依存） |
| 6 | Estimate Snapshot | 同一 fiscal period 30 日前比較 |

## APIキー状態

| キー | 状態 |
|------|------|
| FMP_API_KEY | ${input.apiKeyStatus.fmp} |
| FINNHUB/EARNINGS | ${input.apiKeyStatus.finnhub} |
| ALPHA_VANTAGE | ${input.apiKeyStatus.alpha} |

## Live Verify 結果

**Revenue Revision: ${input.revenuePass}/6** · **Pipeline: ${input.pipelinePass}/6**

| Code | Label | Rev 30D | Source | EPS 30D | Direction | Score | Pipeline | Rev Rev |
|------|-------|---------|--------|---------|-----------|-------|----------|---------|
${table}

## 再実行
\`\`\`bash
npx vitest run tests/unit/bursaRevenueRevisionProviders.test.ts tests/unit/bursaPhase23.test.ts tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
\`\`\`
`;
}

function buildSmokeReport(input: {
  commit: string;
  rows: VerifyRow[];
  revenuePass: number;
  pipelinePass: number;
}): string {
  const now = new Date().toISOString();
  const table = input.rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.revenueRev30dDisplay} | ${r.revisionDirection} | ${r.revisionScore} | ${r.status} |`,
    )
    .join('\n');

  return `# PHASE23_REVENUE_DEVICE_SMOKE_REPORT

## 概要
Phase23 Revenue Revision 6銘柄 Live パイプライン検証 · Phase23.1 Cross Signal 連携確認。

- 実行日時: ${now}
- Git commit: \`${input.commit}\`
- 対象銘柄: ${AUDIT_EARNINGS_REVISION_STOCKS.join(', ')}

## 結果サマリー
| 指標 | 値 |
|------|-----|
| Revenue Revision PASS | ${input.revenuePass}/6 |
| Pipeline PASS | ${input.pipelinePass}/6 |
| Device UI | **DEFERRED**（ADB 未接続 — パイプライン検証のみ） |

## 6銘柄 Revenue Revision 結果
| Code | Label | Rev 30D | Direction | Score | Status |
|------|-------|---------|-----------|-------|--------|
${table}

## エラー
${input.rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`).join('\n') || '- なし'}

## 再実行
\`\`\`bash
npx tsx scripts/bursa-phase23-revenue-revision-verify.ts
\`\`\`
`;
}

async function main() {
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ apiKeys, fetchLiveExternal: true });
  const rows: VerifyRow[] = [];

  for (const code of AUDIT_EARNINGS_REVISION_STOCKS) {
    const meta = STOCK_LABELS[code] ?? { label: code, sector: 'Unknown' };
    rows.push(await verifyOne(code, meta, apiKeys, globalMacro));
  }

  const revenuePass = rows.filter((r) => r.revenueRevisionOk).length;
  const pipelinePass = rows.filter((r) => r.pipelineOk).length;
  const commit = gitShortCommit();

  const payload = {
    generatedAt: new Date().toISOString(),
    commit,
    revenuePass,
    pipelinePass,
    rows,
    apiKeysConfigured: {
      fmp: Boolean(apiKeys.fmpApiKey),
      finnhub: Boolean(apiKeys.earningsApiKey),
      alpha: Boolean(apiKeys.alphaVantageApiKey),
    },
  };

  mkdirSync(join(process.cwd(), 'docs/review/evidence'), { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(
    IMPL_REPORT,
    buildImplReport({
      commit,
      rows,
      revenuePass,
      pipelinePass,
      apiKeyStatus: {
        fmp: apiKeys.fmpApiKey ? '設定済み' : '未設定',
        finnhub: apiKeys.earningsApiKey ? '設定済み' : '未設定',
        alpha: apiKeys.alphaVantageApiKey ? '設定済み' : '未設定',
      },
    }),
    'utf8',
  );
  writeFileSync(
    SMOKE_REPORT,
    buildSmokeReport({ commit, rows, revenuePass, pipelinePass }),
    'utf8',
  );

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
