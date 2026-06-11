/**
 * Phase22 Analyst Target Intelligence 監査
 * npx tsx scripts/bursa-phase22-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_ANALYST_TARGET_STOCKS } from '../src/constants/bursaAnalystTargetIntelligence';
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
import { analystTargetIntelligenceMaterialScoreAdjustment } from '../src/services/bursa/bursaAnalystTargetIntelligenceService';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE22_ANALYST_TARGET_INTELLIGENCE_REPORT.md');

type AuditRow = {
  code: string;
  label: string;
  sector: string;
  status: '成功' | '失敗';
  targetMedian: string;
  targetMean: string;
  bullTarget: string;
  bearTarget: string;
  coverageCount: string;
  upsidePct: string;
  targetTrend: string;
  analystScore: number;
  fairValueMid: string;
  fvVsAnalystDiff: string;
  fvVsAnalystJudgment: string;
  acquisitionRate: string;
  source: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  analystAdj: number;
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
    base = await enrichStockWithDividendIntelligence({
      stock: base,
      stockHtml,
      bundle,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithNewsIntelligence({
      stock: base,
      stockHtml,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithMacroIntelligence({
      stock: base,
      sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithSectorRotationIntelligence({
      stock: base,
      sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithEarningsCall({
      stock: base,
      bundle,
      stockHtml,
      apiKeys,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithAnalystConsensus({
      stock: base,
      apiKeys,
      fetchLiveExternal: true,
    });
    const scoreBefore = base.materialScore;

    base = await enrichStockWithValuationIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithFairValueIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
      bursaBundle: bundle,
    });

    const enriched = await enrichStockWithAnalystTargetIntelligence({
      stock: base,
      fetchLiveExternal: true,
    });

    const a = enriched.analystTargetIntelligence;
    const d = a?.displayJa;
    const ok = Boolean(a?.hasExtractableData && (a.fieldsAcquired ?? 0) >= 5);
    const ratePct = a ? Math.round((a.fieldsAcquired / a.fieldsTotal) * 100) : 0;

    return {
      code,
      label,
      sector,
      status: ok ? '成功' : '失敗',
      targetMedian: d?.targetMedian ?? '未取得',
      targetMean: d?.targetMean ?? '未取得',
      bullTarget: d?.bullTarget ?? '未取得',
      bearTarget: d?.bearTarget ?? '未取得',
      coverageCount: d?.coverageCount ?? '未取得',
      upsidePct: d?.upsidePct ?? '未取得',
      targetTrend: d?.targetTrend ?? '未取得',
      analystScore: a?.analystScore ?? 0,
      fairValueMid: d?.fairValueMid ?? '未取得',
      fvVsAnalystDiff: d?.fairValueVsAnalystDiffPct ?? '未取得',
      fvVsAnalystJudgment: d?.fairValueVsAnalystJudgment ?? '比較不可',
      acquisitionRate: `${ratePct}% (${a?.fieldsAcquired ?? 0}/${a?.fieldsTotal ?? 10})`,
      source: a?.source ?? 'none',
      scoreBefore,
      scoreAfter: enriched.materialScore,
      scoreDelta: enriched.materialScore - scoreBefore,
      analystAdj: analystTargetIntelligenceMaterialScoreAdjustment(a!),
      error: ok ? null : a?.availabilityLabelJa ?? '取得不足',
    };
  } catch (e) {
    return {
      code,
      label,
      sector,
      status: '失敗',
      targetMedian: '未取得',
      targetMean: '未取得',
      bullTarget: '未取得',
      bearTarget: '未取得',
      coverageCount: '未取得',
      upsidePct: '未取得',
      targetTrend: '未取得',
      analystScore: 0,
      fairValueMid: '未取得',
      fvVsAnalystDiff: '未取得',
      fvVsAnalystJudgment: '比較不可',
      acquisitionRate: '0%',
      source: 'none',
      scoreBefore: 0,
      scoreAfter: 0,
      scoreDelta: 0,
      analystAdj: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: AuditRow[] = [];

  for (const s of AUDIT_ANALYST_TARGET_STOCKS) {
    console.log(`[p22] auditing ${s.code} ${s.label}...`);
    rows.push(await auditOne(s.code, s.label, s.sector, apiKeys, globalMacro));
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const avgRate =
    rows.reduce((sum, r) => {
      const m = r.acquisitionRate.match(/(\d+)%/);
      return sum + (m ? Number.parseInt(m[1]!, 10) : 0);
    }, 0) / rows.length;
  const pass = successCount === 6;
  const now = new Date().toISOString();

  const implFiles = [
    'src/types/bursaAnalystTargetIntelligence.ts',
    'src/constants/bursaAnalystTargetIntelligence.ts',
    'src/services/bursa/bursaAnalystTargetIntelligenceProviders.ts',
    'src/services/bursa/bursaAnalystTargetIntelligenceService.ts',
    'src/services/bursa/bursaPhase22Analysis.ts',
    'src/services/bursa/bursaPhase11Analysis.ts',
    'src/services/bursa/bursaMaterialAnalysisService.ts',
    'src/screens/MaterialAnalysisScreen.tsx',
    'src/types/bursaDisclosure.ts',
    'src/types/conciergeEnhancedAnalysis.ts',
    'src/services/buildConciergeEnhancedAnalysis.ts',
    'src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx',
    'tests/unit/bursaPhase22.test.ts',
    'scripts/bursa-phase22-audit-verify.ts',
  ];

  const lines: string[] = [
    '# Phase22 Analyst Target Intelligence 監査レポート',
    '',
    '## 1. 実施日時',
    now,
    '',
    '## 2. Commit Hash',
    commit,
    '',
    '## 3. 実装ファイル',
    ...implFiles.map((f) => `- \`${f}\``),
    '',
    '## 4. 取得率',
    `- 成功銘柄: **${successCount}/6**`,
    `- 平均取得率: **${avgRate.toFixed(0)}%**`,
    `- データ優先順位: Yahoo Finance → Analyst Consensus（Phase14）→ 未取得（推測禁止）`,
    '',
    '## 5. 6銘柄ライブ結果',
    '',
    '| 銘柄 | 名称 | Target Median | Bull | Bear | Coverage | Upside | Trend | Source | 状態 |',
    '|------|------|---------------|------|------|----------|--------|-------|--------|------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.targetMedian} | ${r.bullTarget} | ${r.bearTarget} | ${r.coverageCount} | ${r.upsidePct} | ${r.targetTrend} | ${r.source} | ${r.status} |`,
    ),
    '',
    '## 6. Analyst Score',
    '',
    '| 銘柄 | Analyst Score | 材料スコア変化 | Analyst Adj |',
    '|------|---------------|----------------|-------------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.analystScore >= 0 ? '+' : ''}${r.analystScore} | ${r.scoreBefore} → ${r.scoreAfter} (${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta}) | ${r.analystAdj >= 0 ? '+' : ''}${r.analystAdj} |`,
    ),
    '',
    '## 7. Fair Value 比較',
    '',
    '| 銘柄 | Fair Value | Analyst Target | 差 | 判定 |',
    '|------|------------|----------------|-----|------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.fairValueMid} | ${r.targetMedian} | ${r.fvVsAnalystDiff} | ${r.fvVsAnalystJudgment} |`,
    ),
    '',
    '## 8. PASS/FAIL',
    `**${pass ? 'PASS' : 'FAIL'}** — 6銘柄中 ${successCount} 銘柄で Analyst Target 取得成功（閾値: 6/6）`,
    '',
    '## 9. 残課題',
    '- Bear/Bull は Yahoo Finance 依存のため、Yahoo 未提供時は Analyst Consensus フォールバックでは Mean/Median のみ',
    '- Target Revision Trend は recommendationTrend 2期比較（Yahoo）または Phase14 consensusTrend マッピング',
    '- Reduce/Sell は Yahoo strongSell→Sell, sell→Reduce にマッピング（海外API慣行）',
    '',
    '## 10. 次の推奨Phase',
    '- **Phase22.1** — Valuation Gap Intelligence（Fair Value + Analyst Target 統合判定・単一材料項目化）',
    '- **Phase23** — Earnings Revision × Analyst Target クロスシグナル（上方修正×目標株価上昇の複合スコア）',
    '',
    '## エラー詳細',
    ...rows
      .filter((r) => r.error)
      .map((r) => `- ${r.code}: ${r.error}`),
    ...(rows.every((r) => !r.error) ? ['- なし'] : []),
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`PASS/FAIL: ${pass ? 'PASS' : 'FAIL'} (${successCount}/6)`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
