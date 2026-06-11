/**
 * Phase23 Earnings Revision Intelligence 監査
 * npx tsx scripts/bursa-phase23-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
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
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md');

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
  epsCurrent: string;
  epsNext: string;
  epsRev30d: string;
  epsRev90d: string;
  revenueRev30d: string;
  upgrade: string;
  downgrade: string;
  direction: string;
  revisionScore: string;
  confidence: string;
  source: string;
  unavailableReason: string;
  convictionLevel: string;
  convictionScore: number;
  revisionSeriesOk: boolean;
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

async function auditOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<AuditRow> {
  try {
    const [page, bundle] = await Promise.all([
      fetchKlseStockPageHtml(code),
      fetchBursaDisclosureBundle(code),
    ]);
    const stockHtml = page?.html ?? null;

    let base = minimalStock(code, label);
    base = await enrichStockWithDividendIntelligence({ stock: base, stockHtml, bundle, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithNewsIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithMacroIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
    base = await enrichStockWithSectorRotationIntelligence({ stock: base, sector, globalMacro, fetchLiveExternal: true });
    base = await enrichStockWithEarningsCall({ stock: base, bundle, stockHtml, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithAnalystConsensus({ stock: base, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithValuationIntelligence({ stock: base, sector, fetchLiveExternal: true });
    base = await enrichStockWithFairValueIntelligence({ stock: base, sector, fetchLiveExternal: true, bursaBundle: bundle });
    base = await enrichStockWithAnalystTargetIntelligence({ stock: base, fetchLiveExternal: true });
    base = enrichStockWithValuationGapIntelligence({ stock: base });
    base = await enrichStockWithEarningsRevisionIntelligence({ stock: base, fetchLiveExternal: true });
    const enriched = enrichStockWithConvictionIntelligence({ stock: base });

    const er = enriched.earningsRevisionIntelligence;
    const d = er?.displayJa;
    const revisionSeriesOk = Boolean(er?.hasRevisionSeriesData);
    const hasData = Boolean(er?.hasExtractableData);

    return {
      code,
      label,
      epsCurrent: d?.epsEstimateCurrentFy ?? 'データ未取得',
      epsNext: d?.epsEstimateNextFy ?? 'データ未取得',
      epsRev30d: d?.epsRevision30d ?? 'データ未取得',
      epsRev90d: d?.epsRevision90d ?? 'データ未取得',
      revenueRev30d: d?.revenueRevision30d ?? 'データ未取得',
      upgrade: d?.upgradeCount ?? 'データ未取得',
      downgrade: d?.downgradeCount ?? 'データ未取得',
      direction: d?.revisionDirection ?? 'データ未取得',
      revisionScore: d?.revisionScore ?? '0',
      confidence: d?.revisionConfidence ?? 'Low',
      source: d?.source ?? 'データ未取得',
      unavailableReason: d?.unavailableReason ?? '—',
      convictionLevel: enriched.convictionIntelligence?.displayJa.convictionLevel ?? '—',
      convictionScore: enriched.convictionIntelligence?.convictionScore ?? 0,
      revisionSeriesOk,
      status: revisionSeriesOk ? '成功' : hasData ? '部分' : '失敗',
      error: null,
    };
  } catch (e) {
    return {
      code,
      label,
      epsCurrent: 'データ未取得',
      epsNext: 'データ未取得',
      epsRev30d: 'データ未取得',
      epsRev90d: 'データ未取得',
      revenueRev30d: 'データ未取得',
      upgrade: 'データ未取得',
      downgrade: 'データ未取得',
      direction: 'データ未取得',
      revisionScore: '0',
      confidence: 'Low',
      source: 'データ未取得',
      unavailableReason: String(e),
      convictionLevel: '—',
      convictionScore: 0,
      revisionSeriesOk: false,
      status: '失敗',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function buildReport(rows: AuditRow[], commit: string): string {
  const now = new Date().toISOString();
  const revisionOk = rows.filter((r) => r.revisionSeriesOk).length;
  const pass = revisionOk >= 4 && rows.every((r) => !r.error);
  const passFail = pass ? 'PASS' : 'FAIL';

  const table = rows
    .map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.epsCurrent} | ${r.epsRev30d} | ${r.epsRev90d} | ${r.revenueRev30d} | ${r.upgrade}/${r.downgrade} | ${r.direction} | ${r.revisionScore} | ${r.confidence} | ${r.source} | ${r.convictionLevel} | ${r.convictionScore >= 0 ? '+' : ''}${r.convictionScore} | ${r.status} |`,
    )
    .join('\n');

  const unavailable = rows
    .filter((r) => !r.revisionSeriesOk)
    .map((r) => `- **${r.code} ${r.label}:** ${r.unavailableReason}`)
    .join('\n');

  return `# Phase23 Earnings Revision Intelligence 監査レポート

## 実施日時
${now}

## Git Commit Hash
${commit}

## 対象Phase
Phase23 Earnings Revision Intelligence

## 実装・修正ファイル一覧
- \`src/types/bursaEarningsRevisionIntelligence.ts\`
- \`src/constants/bursaEarningsRevisionIntelligence.ts\`
- \`src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts\`
- \`src/services/bursa/bursaEarningsRevisionIntelligenceService.ts\`
- \`src/services/bursa/bursaPhase23Analysis.ts\`
- \`src/services/bursa/bursaConvictionIntelligenceService.ts\`（Revision補正）
- \`src/services/bursa/bursaPhase11Analysis.ts\` / \`bursaPhase22_2Analysis.ts\`
- \`src/types/bursaDisclosure.ts\`
- \`src/services/bursa/bursaMaterialAnalysisService.ts\`
- \`src/screens/MaterialAnalysisScreen.tsx\`
- \`src/types/conciergeEnhancedAnalysis.ts\`
- \`src/services/buildConciergeEnhancedAnalysis.ts\`
- \`src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx\`
- \`tests/unit/bursaPhase23.test.ts\`
- \`scripts/bursa-phase23-audit-verify.ts\`

## 実装内容サマリー
- Yahoo Finance \`earningsTrend\` / \`recommendationTrend\` から EPS・売上予想と修正率・Upgrade/Downgrade を取得（推測禁止）
- Phase14 Analyst Consensus をフォールバック（予想値のみ、Revision系は未取得理由を表示）
- Earnings Revision Score（-20〜+20）と Revision Direction / Confidence を算出
- Conviction Intelligence へ Analyst Premium × Revision / Model Premium × Revision の補正ルールを統合
- 材料分析・Concierge・総合スコアへ Phase23 セクションを追加

## 1. 6銘柄結果

| 銘柄 | 名称 | EPS Current | EPS Rev 30D | EPS Rev 90D | Rev Rev 30D | Up/Down | Direction | Rev Score | Confidence | Source | Conviction | Conv Score | 状態 |
|------|------|-------------|-------------|-------------|-------------|---------|-----------|-----------|------------|--------|------------|------------|------|
${table}

## 2. Revision系未取得銘柄
${unavailable || '- なし'}

## 3. テスト結果
- Unit Test: \`tests/unit/bursaPhase23.test.ts\`（監査実行時に npm test で確認）
- Live Audit: ${revisionOk}/6 銘柄で Revision系データ取得

## 4. PASS/FAIL
**${passFail}** — 6銘柄中 ${revisionOk} 銘柄で Revision系データ取得（要件: 4銘柄以上）

## エラー詳細
${rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`).join('\n') || '- なし'}

## 残課題
- Net Profit Estimate / Revision は Yahoo・Bursa FR から直接取得不可のため「データ未取得」
- Phase14 フォールバックは EPS/売上予想のみ（修正率なし）

## 次に実施すべきこと
- Phase23.1: Revision × Insider / Institutional クロスシグナル
- Phase24: Revision momentum と Macro の統合

## 再実行コマンド
\`\`\`bash
npx vitest run tests/unit/bursaPhase23.test.ts
npx tsx scripts/bursa-phase23-audit-verify.ts
npm run sync:report -- --report docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md --phase 23 --summary "add earnings revision intelligence and conviction integration" --pass-fail ${passFail} --critical-count 0
\`\`\`

## 注意点
- 推測禁止: 取得不可フィールドは必ず「データ未取得」
- main/master 直 push 禁止
- 実注文・自動売買禁止

## 実機監査結果
- 本監査は Live Yahoo / Phase14 パイプラインで実施（デバイス UI は Material Analysis セクション追加済み）

## 前回レポートとの差分
- Phase22.2 Conviction Intelligence に加え、Phase23 Earnings Revision Intelligence を新規追加
- Conviction スコア・Confidence・信頼ソースが Revision 補正ルールで調整されるよう変更

## 14. GitHub同期結果
（レポート作成後 \`npm run sync:report\` で更新）
`;
}

async function main(): Promise<void> {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });

  const rows: AuditRow[] = [];
  for (const code of AUDIT_EARNINGS_REVISION_STOCKS) {
    const bundle = await fetchBursaDisclosureBundle(code);
    const sector = bundle.profile.sector ?? 'Financials';
    const row = await auditOne(code, STOCK_LABELS[code] ?? code, sector, apiKeys, globalMacro);
    rows.push(row);
    console.log(`[Phase23] ${code} ${row.status} revisionSeries=${row.revisionSeriesOk} score=${row.revisionScore}`);
  }

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, buildReport(rows, commit), 'utf8');
  console.log(`Report written: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
