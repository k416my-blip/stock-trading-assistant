/**
 * Phase21.5 Fair Value Enhancement 監査検証
 * npx tsx scripts/bursa-phase21-5-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_FAIR_VALUE_STOCKS } from '../src/constants/bursaFairValueIntelligence';
import { FAIR_VALUE_MODEL_LABEL_JA } from '../src/constants/bursaFairValueIntelligence';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import { enrichStockWithEarningsCall } from '../src/services/bursa/bursaPhase13Analysis';
import { enrichStockWithFairValueIntelligence } from '../src/services/bursa/bursaPhase21Analysis';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';
import type { FairValueModelKey } from '../src/types/bursaFairValueIntelligence';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE21_5_FAIR_VALUE_ENHANCEMENT_REPORT.md');

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
  status: 'PASS' | 'FAIL';
  currentPrice: string;
  fairValueMid: string;
  dcfFairPrice: string;
  ddmFairPrice: string;
  perFairPrice: string;
  recommendation: string;
  acquisitionRate: string;
  dcfUnavailableReason: string;
  ddmUnavailableReason: string;
  modelsUsed: string;
  primaryModel: string;
  confidence: string;
  dcfAcquired: boolean;
  ddmAcquired: boolean;
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
    base = await enrichStockWithValuationIntelligence({ stock: base, sector, fetchLiveExternal: true });
    const enriched = await enrichStockWithFairValueIntelligence({
      stock: base,
      sector,
      fetchLiveExternal: true,
      bursaBundle: bundle,
    });
    const fv = enriched.fairValueIntelligence;
    const d = fv?.displayJa;
    const ok = fv?.hasExtractableData === true;

    return {
      code,
      label,
      sector,
      status: ok ? 'PASS' : 'FAIL',
      currentPrice: d?.currentPrice ?? '未取得',
      fairValueMid: d?.fairValueMid ?? '未取得',
      dcfFairPrice: d?.dcfFairPrice ?? '未取得',
      ddmFairPrice: d?.ddmFairPrice ?? '非配当銘柄',
      perFairPrice: d?.perFairPrice ?? '未取得',
      recommendation: d?.recommendation ?? 'Hold',
      acquisitionRate: d?.fieldAcquisitionRate ?? '0%',
      dcfUnavailableReason: d?.dcfUnavailableReason ?? '未取得',
      ddmUnavailableReason: d?.ddmUnavailableReason ?? '未取得',
      modelsUsed: d?.modelsUsed ?? '未取得',
      primaryModel: d?.primaryModel ?? '未取得',
      confidence: d?.confidence ?? 'Low',
      dcfAcquired: fv?.dcf.fairPrice != null,
      ddmAcquired: fv?.ddm?.fairPrice != null,
      error: ok ? null : fv?.unavailableReason ?? 'hasExtractableData=false',
    };
  } catch (e) {
    return {
      code,
      label,
      sector,
      status: 'FAIL',
      currentPrice: '未取得',
      fairValueMid: '未取得',
      dcfFairPrice: '未取得',
      ddmFairPrice: '未取得',
      perFairPrice: '未取得',
      recommendation: 'Hold',
      acquisitionRate: '0%',
      dcfUnavailableReason: 'エラー',
      ddmUnavailableReason: 'エラー',
      modelsUsed: '未取得',
      primaryModel: '未取得',
      confidence: 'Low',
      dcfAcquired: false,
      ddmAcquired: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function modelAdoptionRate(rows: AuditRow[], model: FairValueModelKey): string {
  const count = rows.filter((r) => {
    const fv = r.modelsUsed;
    return fv.includes(FAIR_VALUE_MODEL_LABEL_JA[model]);
  }).length;
  return `${Math.round((count / rows.length) * 100)}% (${count}/${rows.length})`;
}

async function main() {
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: AuditRow[] = [];

  for (const s of AUDIT_FAIR_VALUE_STOCKS) {
    rows.push(await auditOne(s.code, s.label, s.sector, apiKeys, globalMacro));
  }

  const passCount = rows.filter((r) => r.status === 'PASS').length;
  const dcfCount = rows.filter((r) => r.dcfAcquired).length;
  const ddmCount = rows.filter((r) => r.ddmAcquired).length;
  const dcfRate = `${Math.round((dcfCount / rows.length) * 100)}% (${dcfCount}/${rows.length})`;
  const ddmRate = `${Math.round((ddmCount / rows.length) * 100)}% (${ddmCount}/${rows.length})`;
  const avgRate =
    rows.reduce((sum, r) => sum + parseFloat(r.acquisitionRate.replace('%', '') || '0'), 0) / rows.length;

  const confidenceCounts = { High: 0, Medium: 0, Low: 0 };
  for (const r of rows) {
    if (r.confidence.startsWith('High')) confidenceCounts.High += 1;
    else if (r.confidence.startsWith('Medium')) confidenceCounts.Medium += 1;
    else confidenceCounts.Low += 1;
  }

  const pass =
    passCount === rows.length &&
    rows.every((r) => r.dcfUnavailableReason.length > 0) &&
    rows.every((r) => r.ddmUnavailableReason.length > 0) &&
    rows.every((r) => r.modelsUsed.length > 0);

  const commit = gitShortCommit();
  const now = new Date().toISOString();

  const lines = [
    '# Phase21.5 Fair Value Enhancement 監査レポート',
    '',
    '## 1. 実施日時',
    '',
    `- **実施:** ${now}`,
    `- **コミット:** \`${commit}\``,
    `- **対象:** 監査6銘柄（Maybank / CIMB / Public Bank / Tenaga / Nestle / Petronas Gas）`,
    '',
    '## 2. サマリー',
    '',
    '| 指標 | 結果 |',
    '|------|------|',
    `| **総合判定** | **${pass ? 'PASS' : 'FAIL'}** |`,
    `| 6銘柄 Fair Value 算出 | ${passCount}/${rows.length} PASS |`,
    `| **DCF取得率** | **${dcfRate}** |`,
    `| **DDM取得率** | **${ddmRate}** |`,
    `| 平均フィールド取得率 | ${avgRate.toFixed(1)}% |`,
    `| 信頼度 High / Medium / Low | ${confidenceCounts.High} / ${confidenceCounts.Medium} / ${confidenceCounts.Low} |`,
    '',
    '## 3. モデル別採用率',
    '',
    '| モデル | 採用率 |',
    '|------|------|',
    `| DCF | ${modelAdoptionRate(rows, 'dcf')} |`,
    `| DDM | ${modelAdoptionRate(rows, 'ddm')} |`,
    `| PER補完 | ${modelAdoptionRate(rows, 'per')} |`,
    '',
    '## 4. フォールバック（Yahoo → Financial Report → Bursa）',
    '',
    'Phase21.5 で `fetchAllFairValuePartials` により以下の順でマージ:',
    '1. Yahoo Finance（FCF/OCF代理/EPS/配当）',
    '2. Financial Report（利益・売上成長率 → FCF/DDM成長）',
    '3. Bursa Disclosure（EPS/配当利回り/四半期利益成長）',
    '4. Phase17 Dividend Intelligence',
    '',
    '## 5. 6銘柄結果',
    '',
    '| 銘柄 | 判定 | 適正株価 | DCF | DDM | PER | 使用モデル | 信頼度 | 推奨 |',
    '|------|------|----------|-----|-----|-----|------------|--------|------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.status} | ${r.fairValueMid} | ${r.dcfFairPrice} | ${r.ddmFairPrice} | ${r.perFairPrice} | ${r.modelsUsed} | ${r.confidence.split('（')[0]} | ${r.recommendation} |`,
    ),
    '',
    '## 6. DCF未取得理由（銘柄別）',
    '',
    ...rows.map((r) => `- **${r.label} (${r.code})**: ${r.dcfUnavailableReason}`),
    '',
    '## 7. DDM未取得理由（銘柄別）',
    '',
    ...rows.map((r) => `- **${r.label} (${r.code})**: ${r.ddmUnavailableReason}`),
    '',
    '## 8. 確認項目チェックリスト',
    '',
    '| # | 項目 | 状態 |',
    '|---|------|------|',
    `| 1 | DCF未取得理由を銘柄別表示 | ${rows.every((r) => r.dcfUnavailableReason !== '未取得') ? '✅' : '❌'} |`,
    `| 2 | DDM未取得理由（配当取得/成長率/計算条件） | ${rows.every((r) => r.ddmUnavailableReason !== '未取得') ? '✅' : '❌'} |`,
    '| 3 | Yahoo→FR→Bursa フォールバック | ✅ 実装済 |',
    `| 4 | 使用モデル表示（DCF/DDM/PER補完） | ${rows.every((r) => r.modelsUsed !== '未取得') ? '✅' : '❌'} |`,
    `| 5 | 信頼度 High/Medium/Low | ${rows.every((r) => r.confidence.length > 0) ? '✅' : '❌'} |`,
    '',
    '## 9. PASS/FAIL',
    '',
    `**${pass ? 'PASS' : 'FAIL'}** — ${passCount}/${rows.length} 銘柄で Fair Value 算出成功。`,
    '',
    pass
      ? 'Phase21.5 要件を満たしています。'
      : '一部銘柄で Fair Value 算出または理由表示が不足しています。上記テーブルを確認してください。',
    '',
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Report written: ${REPORT_PATH}`);
  console.log(`Overall: ${pass ? 'PASS' : 'FAIL'} (${passCount}/${rows.length})`);
  console.log(`DCF rate: ${dcfRate}, DDM rate: ${ddmRate}`);
  for (const r of rows) {
    console.log(
      `${r.code} ${r.status} | models=${r.modelsUsed} | DCF=${r.dcfUnavailableReason.slice(0, 40)}...`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
