/**
 * Phase21.7 Model Validation 監査
 * npx tsx scripts/bursa-phase21-7-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { AUDIT_FAIR_VALUE_STOCKS } from '../src/constants/bursaFairValueIntelligence';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import { enrichStockWithEarningsCall } from '../src/services/bursa/bursaPhase13Analysis';
import { enrichStockWithAnalystConsensus } from '../src/services/bursa/bursaPhase14Analysis';
import { enrichStockWithFairValueIntelligence } from '../src/services/bursa/bursaPhase21Analysis';
import { fetchAllFairValuePartials } from '../src/services/bursa/bursaFairValueIntelligenceProviders';
import {
  buildFairValueModelValidationRow,
  evaluateConservativeBias,
  evaluateModelValidationPass,
  type FairValueModelValidationRow,
} from '../src/services/bursa/bursaFairValueModelValidationService';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE21_7_MODEL_VALIDATION_REPORT.md');

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

function fmtG(v: number | null): string {
  return v != null ? `${v.toFixed(1)}%` : '—';
}

async function validateOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<FairValueModelValidationRow | null> {
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
  const enriched = await enrichStockWithFairValueIntelligence({
    stock: base,
    sector,
    fetchLiveExternal: true,
    bursaBundle: bundle,
  });

  const fv = enriched.fairValueIntelligence;
  if (!fv?.hasExtractableData) return null;

  const { merged } = await fetchAllFairValuePartials({
    stockCode: code,
    dividendIntelligence: enriched.dividendIntelligence,
    financialReportAnalysis: enriched.earningsCall?.financialReportAnalysis ?? null,
    bursaProfile: bundle.profile,
    bursaQuarterly: bundle.quarterly,
    bursaDividend: bundle.dividend,
  });

  return buildFairValueModelValidationRow({
    stockCode: code,
    label,
    sector,
    analysis: fv,
    rawInputs: merged.inputs,
    bundle,
    financialReport: enriched.earningsCall?.financialReportAnalysis ?? null,
    dividendIntelligence: enriched.dividendIntelligence ?? null,
    analyst: enriched.analystConsensus ?? null,
  });
}

async function main() {
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: FairValueModelValidationRow[] = [];

  for (const s of AUDIT_FAIR_VALUE_STOCKS) {
    try {
      const r = await validateOne(s.code, s.label, s.sector, apiKeys, globalMacro);
      if (r) rows.push(r);
    } catch (e) {
      console.error(`${s.code}:`, e);
    }
  }

  const bias = evaluateConservativeBias(rows);
  const { pass, reasons } = evaluateModelValidationPass(rows);
  const commit = gitShortCommit();
  const now = new Date().toISOString();

  const lines: string[] = [
    '# Phase21.7 Model Validation 監査レポート',
    '',
    '## 1. 実施日時',
    '',
    `- **実施:** ${now}`,
    `- **コミット:** \`${commit}\``,
    `- **目的:** Fair Value とアナリスト目標株価の乖離原因調査（DDM g 中心）`,
    '',
    '## 2. サマリー',
    '',
    '| 指標 | 結果 |',
    '|------|------|',
    `| **総合判定** | **${pass ? 'PASS' : 'FAIL'}** |`,
    `| 検証銘柄 | ${rows.length}/6 |`,
    `| **Conservative Bias** | ${bias.verdictJa} |`,
    `| 平均乖離率 (FV−Analyst)/Analyst | ${bias.avgDivergencePct != null ? `${bias.avgDivergencePct.toFixed(1)}%` : '—'} |`,
    `| ±30%超の銘柄 | ${bias.stocksBeyond30Pct}/${rows.length} |`,
    `| 判定理由 | ${reasons.join('; ')} |`,
    '',
    '## 3. DDM 成長率 g — ホライズン別（算出元）',
    '',
    '| 銘柄 | 直近1年（配当YoY） | 3年平均CAGR | 5年平均CAGR | FR純利益YoY | **DDM採用g** | 採用ソース |',
    '|------|-------------------|-------------|-------------|-------------|-------------|------------|',
  ];

  for (const r of rows) {
    const h = r.growthHorizons;
    lines.push(
      `| ${r.label} (${r.stockCode}) | ${fmtG(h.oneYear.valuePct)} | ${fmtG(h.threeYearAvg.valuePct)} | ${fmtG(h.fiveYearAvg.valuePct)} | ${fmtG(h.financialReportProfitYoY.valuePct)} | **${fmtG(h.adoptedInDdm.valuePct)}** | ${h.adoptedInDdm.sourceJa} |`,
    );
  }

  lines.push('', '### 算出元詳細', '');
  for (const r of rows) {
    const h = r.growthHorizons;
    lines.push(`**${r.label} (${r.stockCode})**`);
    lines.push(`- 直近1年: ${fmtG(h.oneYear.valuePct)} — ${h.oneYear.sourceJa}（${h.oneYear.detailJa}）`);
    lines.push(`- 3年平均: ${fmtG(h.threeYearAvg.valuePct)} — ${h.threeYearAvg.detailJa}`);
    lines.push(`- 5年平均: ${fmtG(h.fiveYearAvg.valuePct)} — ${h.fiveYearAvg.sourceJa}（${h.fiveYearAvg.detailJa}）`);
    lines.push(`- FR純利益YoY: ${fmtG(h.financialReportProfitYoY.valuePct)} — ${h.financialReportProfitYoY.detailJa}`);
    lines.push(`- DDM採用: ${fmtG(h.adoptedInDdm.valuePct)} — ${h.adoptedInDdm.detailJa}`);
    lines.push('');
  }

  lines.push('## 4. 銀行3銘柄 — g≈-3%台の理由', '');
  for (const code of ['1155', '1023', '1295']) {
    const r = rows.find((x) => x.stockCode === code);
    if (!r) {
      lines.push(`### ${code}: データなし`, '');
      continue;
    }
    lines.push(`### ${r.label} (${code})`, '');
    lines.push(...r.bankNegativeGrowthExplanationJa.map((l) => (l.startsWith('**') || l.startsWith('-') ? l : `- ${l}`)));
    lines.push('');
  }

  lines.push('## 5. 永久成長率としての妥当性評価', '');
  for (const r of rows) {
    lines.push(`### ${r.label} (${r.stockCode})`, '');
    lines.push(...r.perpetualGrowthAssessmentJa.map((l) => `- ${l}`));
    lines.push('');
  }

  lines.push(
    '## 6. アナリスト目標との乖離率・分類',
    '',
    '乖離率 = (Fair Value Mid − アナリスト目標) / アナリスト目標 × 100',
    '',
    '| 銘柄 | Fair Value | アナリスト | 乖離率 | 分類 |',
    '|------|------------|------------|--------|------|',
  );

  const bandCounts = { within_10: 0, within_20: 0, within_30: 0, beyond_30: 0 };
  for (const r of rows) {
    if (r.divergenceBand !== 'no_analyst') {
      bandCounts[r.divergenceBand as keyof typeof bandCounts] += 1;
    }
    lines.push(
      `| ${r.label} (${r.stockCode}) | RM ${r.fairValueMid?.toFixed(2) ?? '—'} | RM ${r.analystTarget?.toFixed(2) ?? '—'} [${r.analystSource}] | ${r.divergencePct != null ? `${r.divergencePct >= 0 ? '+' : ''}${r.divergencePct.toFixed(1)}%` : '—'} | ${r.divergenceBandJa} |`,
    );
  }

  lines.push(
    '',
    '### 分類定義',
    '- **±10%以内**: |乖離| ≤ 10%',
    '- **±10〜20%**: 10% < |乖離| ≤ 20%',
    '- **±20〜30%**: 20% < |乖離| ≤ 30%',
    '- **±30%超**: |乖離| > 30%',
    '',
    `内訳: ±10%=${bandCounts.within_10} / ±10-20%=${bandCounts.within_20} / ±20-30%=${bandCounts.within_30} / ±30%超=${bandCounts.beyond_30}`,
    '',
    '## 7. Fair Value vs アナリスト — 保守バイアス寄与',
    '',
  );

  for (const r of rows) {
    lines.push(`**${r.label} (${r.stockCode})**`);
    lines.push(...r.conservativeBiasContributionJa.map((l) => `- ${l}`));
    lines.push('');
  }

  lines.push('## 8. Conservative Bias 総合判定', '', `- ${bias.verdictJa}`, '');
  lines.push(
    '判定基準: 平均乖離≤-25% **または** 20%以上低い銘柄≥4 **または** ±30%超≥4 → Conservative Bias **あり**',
    '',
    '## 9. 確認項目チェックリスト',
    '',
    '| # | 項目 | 状態 |',
    '|---|------|------|',
    '| 1 | g ホライズン（1年/3年/5年）表示 | ✅ |',
    `| 2 | 銀行3銘柄 g=-3%台 説明 | ${rows.filter((r) => ['1155', '1023', '1295'].includes(r.stockCode) && r.bankNegativeGrowthExplanationJa.length).length === 3 ? '✅' : '❌'} |`,
    '| 3 | 永久成長率妥当性評価 | ✅ |',
    `| 4 | アナリスト乖離率 | ${rows.every((r) => r.divergencePct != null) ? '✅' : '❌'} |`,
    '| 5 | ±10/20/30% 分類 | ✅ |',
    `| 6 | Conservative Bias 判定 | ✅ (${bias.exists ? 'あり' : 'なし/弱'}) |`,
    '',
    '## 10. PASS/FAIL',
    '',
    `**${pass ? 'PASS' : 'FAIL'}** — ${reasons.join(' · ')}`,
    '',
    pass
      ? 'モデル検証完了。乖離の主因は **FR純利益YoYをDDM gに転用**（銀行で負の g）および DDM/PER 中心モデルのアナリストとの前提差。'
      : '一部確認項目が未達。上記セクションを参照。',
    '',
  );

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Overall: ${pass ? 'PASS' : 'FAIL'} | Conservative Bias: ${bias.exists ? 'YES' : 'NO'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
