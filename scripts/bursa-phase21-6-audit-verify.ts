/**
 * Phase21.6 Fair Value Validation 監査
 * npx tsx scripts/bursa-phase21-6-audit-verify.ts
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
  buildFairValueValidationDetail,
  evaluateFairValueValidationPass,
  FAIR_VALUE_CONFIDENCE_CRITERIA_JA,
  type FairValueValidationDetail,
} from '../src/services/bursa/bursaFairValueValidationService';
import { fetchBursaDisclosureBundle } from '../src/services/bursa/bursaDisclosureService';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE21_6_FAIR_VALUE_VALIDATION_REPORT.md');

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

async function validateOne(
  code: string,
  label: string,
  sector: string,
  apiKeys: AnalysisApiKeys,
  globalMacro: Awaited<ReturnType<typeof buildGlobalMacroIntelligenceAnalysis>>,
): Promise<FairValueValidationDetail | null> {
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

  return buildFairValueValidationDetail({
    stockCode: code,
    label,
    sector,
    analysis: fv,
    rawInputs: merged.inputs,
    analyst: enriched.analystConsensus ?? null,
  });
}

async function main() {
  const apiKeys = loadAuditApiKeys();
  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const details: FairValueValidationDetail[] = [];

  for (const s of AUDIT_FAIR_VALUE_STOCKS) {
    try {
      const d = await validateOne(s.code, s.label, s.sector, apiKeys, globalMacro);
      if (d) details.push(d);
    } catch (e) {
      console.error(`${s.code} failed:`, e);
    }
  }

  const { pass, reasons } = evaluateFairValueValidationPass({ details });
  const commit = gitShortCommit();
  const now = new Date().toISOString();
  const analystCount = details.filter((d) => d.analystTargetPrice != null).length;

  const maybank = details.find((d) => d.stockCode === '1155');
  const cimb = details.find((d) => d.stockCode === '1023');

  const lines: string[] = [
    '# Phase21.6 Fair Value Validation 監査レポート',
    '',
    '## 1. 実施日時',
    '',
    `- **実施:** ${now}`,
    `- **コミット:** \`${commit}\``,
    `- **対象:** 1155 / 1023 / 1295 / 5347 / 4707 / 6033`,
    '',
    '## 2. サマリー',
    '',
    '| 指標 | 結果 |',
    '|------|------|',
    `| **総合判定** | **${pass ? 'PASS' : 'FAIL'}** |`,
    `| 検証完了銘柄 | ${details.length}/6 |`,
    `| アナリスト目標株価取得 | ${analystCount}/6 |`,
    `| 判定理由 | ${reasons.join('; ')} |`,
    '',
    '## 3. 信頼度（High / Medium / Low）判定基準',
    '',
    ...FAIR_VALUE_CONFIDENCE_CRITERIA_JA.map((c) => `- ${c}`),
    '',
    '## 4. Maybank（1155）Avoid 詳細説明',
    '',
  ];

  if (maybank) {
    lines.push(...maybank.avoidExplanationJa.map((l) => (l.startsWith('**') || l.startsWith('---') ? l : `- ${l}`)));
    lines.push('');
    lines.push('### DDM 使用パラメータ');
    if (maybank.ddmInputs) {
      const d = maybank.ddmInputs;
      lines.push(`- 配当 D₀: ${d.dividendPerShare?.toFixed(4) ?? '—'} RM（利回り ${d.dividendYieldPct?.toFixed(2) ?? '—'}%）`);
      lines.push(`- 成長率 g: ${d.dividendGrowthPct?.toFixed(1) ?? '—'}%`);
      lines.push(`- 割引率 r: ${d.requiredReturnPct.toFixed(1)}%`);
      lines.push(`- 式: ${d.formulaJa}`);
      lines.push(`- ソース: ${d.sourceJa}`);
    } else {
      lines.push('- DDM未使用');
    }
    lines.push('');
    lines.push('### 算出式');
    lines.push(...maybank.formulaLinesJa.map((l) => `- ${l}`));
    lines.push('');
    lines.push('### アナリスト目標株価比較');
    lines.push(`- ${maybank.analystVsFairValueJa}`);
  } else {
    lines.push('- Maybank 検証データ未取得 → **FAIL**');
  }

  lines.push('', '## 5. CIMB（1023）Avoid 詳細説明', '');

  if (cimb) {
    lines.push(...cimb.avoidExplanationJa.map((l) => (l.startsWith('**') || l.startsWith('---') ? l : `- ${l}`)));
    lines.push('');
    lines.push('### DDM 使用パラメータ');
    if (cimb.ddmInputs) {
      const d = cimb.ddmInputs;
      lines.push(`- 配当 D₀: ${d.dividendPerShare?.toFixed(4) ?? '—'} RM（利回り ${d.dividendYieldPct?.toFixed(2) ?? '—'}%）`);
      lines.push(`- 成長率 g: ${d.dividendGrowthPct?.toFixed(1) ?? '—'}%`);
      lines.push(`- 割引率 r: ${d.requiredReturnPct.toFixed(1)}%`);
      lines.push(`- 式: ${d.formulaJa}`);
    }
    lines.push('');
    lines.push('### アナリスト目標株価比較');
    lines.push(`- ${cimb.analystVsFairValueJa}`);
  } else {
    lines.push('- CIMB 検証データ未取得 → **FAIL**');
  }

  lines.push('', '## 6. 全銘柄 — DDM パラメータ', '');
  lines.push('| 銘柄 | D₀ | g | r | DDM式結果 | ソース |');
  lines.push('|------|----|---|---|-----------|--------|');
  for (const d of details) {
    const dd = d.ddmInputs;
    if (dd) {
      lines.push(
        `| ${d.stockCode} | ${dd.dividendPerShare?.toFixed(4) ?? '—'} | ${dd.dividendGrowthPct?.toFixed(1) ?? '—'}% | ${dd.requiredReturnPct.toFixed(1)}% | ${dd.formulaJa} | ${dd.sourceJa} |`,
      );
    } else {
      lines.push(`| ${d.stockCode} | — | — | — | 未使用 | — |`);
    }
  }

  lines.push('', '## 7. 全銘柄 — Fair Value 算出式', '');
  for (const d of details) {
    const stock = AUDIT_FAIR_VALUE_STOCKS.find((s) => s.code === d.stockCode);
    lines.push(`### ${stock?.label ?? d.stockCode} (${d.stockCode})`, '');
    lines.push(...d.formulaLinesJa.map((l) => `- ${l}`));
    lines.push('');
    lines.push(`${d.confidenceCriteriaAppliedJa}`, '');
  }

  lines.push('## 8. アナリスト目標株価 vs Fair Value', '');
  lines.push('| 銘柄 | アナリスト目標 | ソース | 比較 |');
  lines.push('|------|----------------|--------|------|');
  for (const d of details) {
    const tgt = d.analystTargetPrice != null ? `RM ${d.analystTargetPrice.toFixed(2)}` : '未取得';
    lines.push(`| ${d.stockCode} | ${tgt} | ${d.analystTargetSource} | ${d.analystVsFairValueJa} |`);
  }

  lines.push('', '## 9. 確認項目チェックリスト', '');
  lines.push('| # | 項目 | 状態 |');
  lines.push('|---|------|------|');
  lines.push(`| 1 | Maybank Avoid 詳細説明 | ${maybank ? '✅' : '❌'} |`);
  lines.push(`| 2 | CIMB Avoid 詳細説明 | ${cimb ? '✅' : '❌'} |`);
  lines.push(`| 3 | DDM（配当/成長率/割引率）表示 | ${details.filter((d) => d.ddmInputs).length >= 4 ? '✅' : '❌'} |`);
  lines.push(`| 4 | Fair Value 算出式（銘柄別） | ${details.length === 6 ? '✅' : '❌'} |`);
  lines.push('| 5 | 信頼度判定基準 | ✅ |');
  lines.push(`| 6 | アナリスト目標株価比較 | ${analystCount >= 1 ? '✅' : '❌'} (${analystCount}/6) |`);
  lines.push('', '## 10. PASS/FAIL', '');
  lines.push(`**${pass ? 'PASS' : 'FAIL'}** — ${reasons.join(' · ')}`, '');

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Overall: ${pass ? 'PASS' : 'FAIL'} (${details.length}/6 validated, analyst ${analystCount}/6)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
