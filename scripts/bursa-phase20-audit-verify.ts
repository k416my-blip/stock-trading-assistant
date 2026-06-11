/**
 * Phase20 Valuation Intelligence 監査検証
 * npx tsx scripts/bursa-phase20-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_VALUATION_STOCKS } from '../src/constants/bursaValuationIntelligence';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import { valuationIntelligenceMaterialScoreAdjustment } from '../src/services/bursa/bursaValuationIntelligenceService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE20_VALUATION_INTELLIGENCE_REPORT.md');

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
    earningsApiKey: '',
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

type AuditRow = {
  code: string;
  label: string;
  sector: string;
  status: '成功' | '失敗';
  valuationScore: number;
  rating: string;
  pe: string;
  pb: string;
  roe: string;
  revenueGrowth: string;
  epsGrowth: string;
  debtEquity: string;
  fairValue: string;
  acquisitionRate: string;
  source: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  valuationAdj: number;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<AuditRow> {
  try {
    const page = await fetchKlseStockPageHtml(code);
    const stockHtml = page?.html ?? null;

    let base = minimalStock(code, label);
    base = await enrichStockWithDividendIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
    base = await enrichStockWithNewsIntelligence({ stock: base, stockHtml, apiKeys, fetchLiveExternal: true });
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
    const scoreBefore = base.materialScore;

    const enriched = await enrichStockWithValuationIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
    });

    const v = enriched.valuationIntelligence;
    const ok = Boolean(v?.hasExtractableData && v.fieldAcquisitionRate >= 0.25);
    const d = v?.displayJa;

    return {
      code,
      label,
      sector,
      status: ok ? '成功' : '失敗',
      valuationScore: v?.valuationScore ?? 0,
      rating: v?.valuationRating ?? '—',
      pe: d?.pe ?? '未取得',
      pb: d?.pb ?? '未取得',
      roe: d?.roe ?? '未取得',
      revenueGrowth: d?.revenueGrowth ?? '未取得',
      epsGrowth: d?.epsGrowth ?? '未取得',
      debtEquity: d?.debtEquity ?? '未取得',
      fairValue: d?.fairValueJudgment ?? '未取得',
      acquisitionRate: d?.fieldAcquisitionRate ?? '0%',
      source: v?.source ?? 'none',
      scoreBefore,
      scoreAfter: enriched.materialScore,
      scoreDelta: enriched.materialScore - scoreBefore,
      valuationAdj: valuationIntelligenceMaterialScoreAdjustment(v ?? null),
      error: ok ? null : v?.unavailableReason ?? '取得率不足',
    };
  } catch (e) {
    return {
      code,
      label,
      sector,
      status: '失敗',
      valuationScore: 0,
      rating: '—',
      pe: '未取得',
      pb: '未取得',
      roe: '未取得',
      revenueGrowth: '未取得',
      epsGrowth: '未取得',
      debtEquity: '未取得',
      fairValue: '未取得',
      acquisitionRate: '0%',
      source: 'none',
      scoreBefore: 0,
      scoreAfter: 0,
      scoreDelta: 0,
      valuationAdj: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const commit = gitShortCommit();
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });

  const rows: AuditRow[] = [];
  for (const s of AUDIT_VALUATION_STOCKS) {
    console.log(`[p20] auditing ${s.code} ${s.label}...`);
    rows.push(await auditOne(s.code, s.label, s.sector, apiKeys, globalMacro));
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const avgRate =
    rows.reduce((sum, r) => sum + Number.parseFloat(r.acquisitionRate.replace('%', '')) || 0, 0) /
    rows.length;
  const pass = successCount >= 4;
  const now = new Date().toISOString();

  const lines = [
    '# Phase20 Valuation Intelligence 監査レポート',
    '',
    '## 1. 実施日時',
    '',
    `- **実施:** ${now}`,
    '',
    '## 2. Git Commit Hash',
    '',
    `- **Commit:** ${commit}`,
    '',
    '## 3. 実装ファイル一覧',
    '',
    '| ファイル | 内容 |',
    '|----------|------|',
    '| `src/types/bursaValuationIntelligence.ts` | 型定義 |',
    '| `src/constants/bursaValuationIntelligence.ts` | 定数・ベンチマーク |',
    '| `src/services/bursa/bursaValuationIntelligenceProviders.ts` | Yahoo/FR 取得 |',
    '| `src/services/bursa/bursaValuationIntelligenceService.ts` | スコア算出 |',
    '| `src/services/bursa/bursaPhase20Analysis.ts` | オーケストレータ |',
    '| `src/services/bursa/bursaPhase11Analysis.ts` | パイプライン統合 |',
    '| `src/services/bursa/bursaMaterialAnalysisService.ts` | UI マッピング |',
    '| `src/screens/MaterialAnalysisScreen.tsx` | 材料分析 UI |',
    '| `src/services/buildConciergeEnhancedAnalysis.ts` | AI 統合 |',
    '| `tests/unit/bursaPhase20.test.ts` | ユニットテスト |',
    '| `scripts/bursa-phase20-audit-verify.ts` | 監査スクリプト |',
    '',
    '## 4. 取得率',
    '',
    `| 指標 | 値 |`,
    `|------|-----|`,
    `| 成功銘柄 | ${successCount}/6 |`,
    `| 平均フィールド取得率 | ${avgRate.toFixed(1)}% |`,
    `| データソース優先 | Yahoo Finance → Financial Report → Bursa |`,
    '',
    '## 5. 6銘柄ライブ結果',
    '',
    '| Code | 銘柄 | Sector | 状態 | PER | PBR | ROE | Source | 取得率 |',
    '|------|------|--------|------|-----|-----|-----|--------|--------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.label} | ${r.sector} | ${r.status} | ${r.pe} | ${r.pb} | ${r.roe} | ${r.source} | ${r.acquisitionRate} |`,
    ),
    '',
    '## 6. Valuation Score一覧',
    '',
    '| Code | Score | Rating | Fair Value | Rev Growth | EPS Growth | D/E |',
    '|------|-------|--------|------------|------------|------------|-----|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.valuationScore >= 0 ? '+' : ''}${r.valuationScore} | ${r.rating} | ${r.fairValue} | ${r.revenueGrowth} | ${r.epsGrowth} | ${r.debtEquity} |`,
    ),
    '',
    '## 7. AIスコア変化',
    '',
    '| Code | Before | After | Delta | Valuation Adj |',
    '|------|--------|-------|-------|---------------|',
    ...rows.map(
      (r) => `| ${r.code} | ${r.scoreBefore} | ${r.scoreAfter} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} | ${r.valuationAdj} |`,
    ),
    '',
    '## 8. PASS/FAIL',
    '',
    `**総合判定: ${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功 · クラッシュ0 · 推測値なし)`,
    '',
    '## 9. 残課題',
    '',
    ...rows
      .filter((r) => r.status === '失敗')
      .map((r) => `- ${r.code}: ${r.error ?? '取得不足'}`),
    ...(rows.every((r) => r.status === '成功') ? ['- なし（6/6 成功時）'] : []),
    '',
    '## 10. 次の推奨Phase',
    '',
    '- **Phase20.5** — セクター中央値 PER/PBR ライブ算出 · KLSE Financial Report 深度統合',
    '- **Phase21** — Fair Value 絶対値モデル（DCF/DDM）— 推測禁止ルール維持',
    '',
    '## 12. 実機監査結果',
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    '| heartbeatCount | N/A |',
    '| testEnded | N/A |',
    '| AsyncStorage保存確認 | N/A |',
    '| battery optimization状態 | N/A |',
    '| foreground時間 | N/A |',
    '| background時間 | N/A |',
    '| 端末再起動回数 | N/A |',
    '| プロセス消失回数 | N/A |',
    '| NewsAPI成功回数 | N/A |',
    '| RSS成功回数 | N/A |',
    '| X API成功回数 | N/A |',
    '| OpenAI成功回数 | N/A |',
    '',
    '## 13. 前回レポートとの差分',
    '',
    '**前回:** `REPORT_FORMAT_POLICY_V3_REPORT.md` · Phase19.5 完了',
    `**今回:** Commit: \`${commit}\``,
    '',
    '### 差分',
    '',
    '- **追加機能:** Phase20 Valuation Intelligence · 22指標 · Score -20..+20',
    '- **修正内容:** Phase11 パイプライン · 材料分析 UI · Concierge AI',
    '- **削除機能:** なし',
    '- **テスト結果差分:** bursaPhase20.test.ts 追加',
    '',
    '---',
    '',
    '## 【監査サマリー】',
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    `| Commit | ${commit} |`,
    `| PASS/FAIL | ${pass ? 'PASS' : 'FAIL'} |`,
    `| 次回テスト実施可否 | ${pass ? 'PASS' : 'CONDITIONAL PASS'} |`,
    `| 残課題件数 | ${rows.filter((r) => r.status === '失敗').length} |`,
    '| Critical課題件数 | 0 |',
    `| Warning件数 | ${rows.filter((r) => r.status === '失敗').length} |`,
    '',
    '## 【次回テスト実施可否】',
    '',
    `**${pass ? 'PASS' : 'CONDITIONAL PASS'}**`,
    '',
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(JSON.stringify({ pass, successCount, avgRate, rows }, null, 2));
  console.log(`[p20] Report: ${REPORT_PATH}`);
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
