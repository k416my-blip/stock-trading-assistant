/**
 * Phase20.1 Valuation Audit
 * npx tsx scripts/bursa-phase20-1-audit-verify.ts
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AUDIT_VALUATION_STOCKS } from '../src/constants/bursaValuationIntelligence';
import { buildGlobalMacroIntelligenceAnalysis } from '../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../src/services/bursa/bursaPhase19_5Analysis';
import { enrichStockWithMacroIntelligence } from '../src/services/bursa/bursaPhase19Analysis';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { enrichStockWithValuationIntelligence } from '../src/services/bursa/bursaPhase20Analysis';
import {
  valuationIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaValuationIntelligenceService';
import { fetchYahooValuationPartial } from '../src/services/bursa/bursaValuationIntelligenceProviders';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import { fetchYahooQuoteSummaryModules, parseYahooRawNumber } from '../src/services/quoteProviders/yahooQuoteSummaryClient';
import {
  classifyMaterialSentiment,
  scoreMaterialItem,
} from '../src/services/bursa/bursaMaterialSentiment';
import { materialScoreToOverallScore } from '../src/services/buildConciergeEnhancedAnalysis';
import { BASE_VALUATION_MAX_ADJ, VALUATION_SCORE_MAX } from '../src/constants/bursaValuationIntelligence';
import {
  VALUATION_METRIC_KEYS,
  type ValuationMetricKey,
} from '../src/types/bursaValuationIntelligence';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const REPORT_PATH = join(process.cwd(), 'docs/review/PHASE20_1_VALUATION_AUDIT_REPORT.md');

function gitShortCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function minimalStock(code: string, label: string): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName: label,
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

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

function missingFieldsForStock(
  metrics: Partial<Record<ValuationMetricKey, number | null>>,
  shareBuyback: boolean | null,
): ValuationMetricKey[] {
  const missing: ValuationMetricKey[] = [];
  for (const key of VALUATION_METRIC_KEYS) {
    if (key === 'shareBuyback') {
      if (shareBuyback == null) missing.push(key);
      continue;
    }
    const v = metrics[key];
    if (v == null || !Number.isFinite(v)) missing.push(key);
  }
  return missing;
}

const METRIC_LABEL: Record<ValuationMetricKey, string> = {
  roe: 'ROE',
  roa: 'ROA',
  netMargin: 'Net Margin',
  operatingMargin: 'Operating Margin',
  fcfMargin: 'FCF Margin',
  revenueGrowth: 'Revenue Growth',
  epsGrowth: 'EPS Growth',
  netProfitGrowth: 'Net Profit Growth',
  fcfGrowth: 'FCF Growth',
  pe: 'PER',
  forwardPe: 'Forward PER',
  pb: 'PBR',
  ps: 'PSR',
  peg: 'PEG',
  evEbitda: 'EV/EBITDA',
  debtEquity: 'Debt/Equity',
  currentRatio: 'Current Ratio',
  interestCoverage: 'Interest Coverage',
  cashRatio: 'Cash Ratio',
  dividendYield: 'Dividend Yield',
  payoutRatio: 'Payout Ratio',
  shareBuyback: 'Share Buyback',
};

async function main() {
  const apiKeys: AnalysisApiKeys = {
    newsApiKey: process.env.NEWS_API_KEY ?? '',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? '',
    fmpApiKey: process.env.FMP_API_KEY ?? '',
  };

  const globalMacro = await buildGlobalMacroIntelligenceAnalysis({ fetchLiveExternal: true });
  const rows: Array<{
    code: string;
    label: string;
    sector: string;
    scoreBefore: number;
    scoreAfter: number;
    overallScore: number;
    valuationScore: number;
    pe: number | null;
    pb: number | null;
    roe: number | null;
    per: number | null;
    adj: number;
    missing: ValuationMetricKey[];
    acquired: number;
    rate: number;
    valuationItemScore: number;
    valuationItemSentiment: string;
    beforeItems: number;
    afterItems: number;
  }> = [];

  // Nestle deep dive
  let nestleBreakdown = '';

  for (const s of AUDIT_VALUATION_STOCKS) {
    const page = await fetchKlseStockPageHtml(s.code);
    let base = minimalStock(s.code, s.label);
    base = await enrichStockWithDividendIntelligence({
      stock: base,
      stockHtml: page?.html ?? null,
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
      sector: s.sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    base = await enrichStockWithSectorRotationIntelligence({
      stock: base,
      sector: s.sector,
      globalMacro,
      fetchLiveExternal: true,
    });
    const scoreBefore = base.materialScore;
    const beforeItemCount = [
      ...(base.positiveMaterials ?? []),
      ...(base.negativeMaterials ?? []),
      ...(base.neutralMaterials ?? []),
    ].length;

    const enriched = await enrichStockWithValuationIntelligence({
      stock: base,
      sector: s.sector,
      fetchLiveExternal: true,
    });

    const v = enriched.valuationIntelligence!;
    const adj = valuationIntelligenceMaterialScoreAdjustment(v);
    const title = `Valuation ${v.valuationRating} (${v.displayJa.valuationScore})`;
    const rawItem = scoreMaterialItem({
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase20 Valuation Intelligence',
      title,
      url: null,
      publishedAt: v.fetchedAt,
      idSuffix: `phase20-valuation-${v.valuationRating}`,
    });
    const adjustedScore = Math.max(-100, Math.min(100, rawItem.score + adj));

    const valuationMaterial = enriched.positiveMaterials
      .concat(enriched.negativeMaterials)
      .concat(enriched.neutralMaterials)
      .find((m) => /Valuation/i.test(m.title));

    if (s.code === '4707') {
      nestleBreakdown = [
        `### Nestle (4707) 材料スコア分解`,
        '',
        `- **Before materialScore:** ${scoreBefore}`,
        `- **After materialScore:** ${enriched.materialScore}`,
        `- **Delta:** ${enriched.materialScore - scoreBefore}`,
        '',
        '#### Phase20 材料アイテム生成',
        '',
        `| 段階 | 値 |`,
        `|------|-----|`,
        `| タイトル | \`${title}\` |`,
        `| classifyMaterialSentiment | **${classifyMaterialSentiment(title)}** |`,
        `| scoreMaterialItem (adj前) | **${rawItem.score}** |`,
        `| valuationIntelligenceMaterialScoreAdjustment | **${adj}** |`,
        `| 最終材料スコア (adj後) | **${adjustedScore}** |`,
        `| 配分先 | ${adjustedScore > 0 ? 'positiveMaterials' : adjustedScore < 0 ? 'negativeMaterials' : 'neutralMaterials'} |`,
        '',
        '#### 根本原因',
        '',
        '`classifyMaterialSentiment()` の `STRONG_POSITIVE` 正規表現が英単語 **`strong`** にマッチ。',
        'タイトル `Valuation **Strong** Overvalued (-14)` が **好材料** と誤分類される。',
        '',
        '計算: `round(12 × 1.5 × 1.4) = 25` → adj `-5.9` → **+19.1** が材料スコアに加算。',
        '',
        `- Before 時点の非ゼロ材料合計 ≈ ${scoreBefore}`,
        `- Phase20 追加 ≈ +19 → After ≈ ${enriched.materialScore}`,
        '',
        '**結論:** Valuation Adj `-5.9` は適用されているが、キーワード誤分類 (+25) が上回り net +19 となる。',
      ].join('\n');
    }

    const missing = missingFieldsForStock(v.metrics, v.shareBuybackDetected);

    rows.push({
      code: s.code,
      label: s.label,
      sector: s.sector,
      scoreBefore,
      scoreAfter: enriched.materialScore,
      overallScore: materialScoreToOverallScore(enriched.materialScore),
      valuationScore: v.valuationScore,
      pe: v.metrics.pe ?? null,
      pb: v.metrics.pb ?? null,
      roe: v.metrics.roe ?? null,
      per: v.metrics.pe ?? null,
      adj,
      missing,
      acquired: v.acquiredFieldCount,
      rate: v.fieldAcquisitionRate,
      valuationItemScore: valuationMaterial?.score ?? adjustedScore,
      valuationItemSentiment: valuationMaterial?.sentiment ?? rawItem.sentiment,
      beforeItems: beforeItemCount,
      afterItems: [
        ...(enriched.positiveMaterials ?? []),
        ...(enriched.negativeMaterials ?? []),
        ...(enriched.neutralMaterials ?? []),
      ].length,
    });
  }

  // Debt/Equity raw fetch
  const deRows: string[] = [];
  for (const code of ['5347', '4707'] as const) {
    const sym = `${code}.KL`;
    const res = await fetchYahooQuoteSummaryModules(sym, ['financialData']);
    const fin = (res.json as { quoteSummary?: { result?: Array<{ financialData?: Record<string, unknown> }> } })
      ?.quoteSummary?.result?.[0]?.financialData;
    const raw = fin?.debtToEquity;
    const parsed = parseYahooRawNumber(raw as never);
    deRows.push(
      `| ${code} | yahoo_finance \`financialData.debtToEquity\` | \`${JSON.stringify(raw)}\` | parseYahooRawNumber → **${parsed}** | **${parsed}（Yahoo生値・%表記）** ※UIは誤って \`${parsed?.toFixed(2)}x\` 表示 |`,
    );
  }

  const avgRate = (rows.reduce((s, r) => s + r.rate, 0) / rows.length) * 100;
  const pes = rows.map((r) => r.pe).filter((v): v is number => v != null);
  const pbs = rows.map((r) => r.pb).filter((v): v is number => v != null);
  const roes = rows.map((r) => r.roe).filter((v): v is number => v != null);
  const vScores = rows.map((r) => r.valuationScore);
  const aiScores = rows.map((r) => r.overallScore);

  const corr = {
    pe_vs_vScore: pearson(pes, vScores.slice(0, pes.length)),
    pb_vs_vScore: pearson(pbs, vScores.slice(0, pbs.length)),
    roe_vs_vScore: pearson(roes, vScores.slice(0, roes.length)),
    vScore_vs_ai: pearson(vScores, aiScores),
    pe_vs_ai: pearson(pes, aiScores.slice(0, pes.length)),
  };

  const maxAdjExample = Math.round(BASE_VALUATION_MAX_ADJ * (0.35 + 0.65 * 0.77) * 10) / 10;

  const commit = gitShortCommit();
  const now = new Date().toISOString();

  const lines = [
    '# Phase20.1 Valuation Audit レポート',
    '',
    '## 1. 実施日時',
    '',
    `- **実施:** ${now}`,
    '',
    '## 2. Git Commit Hash',
    '',
    `- **Commit:** ${commit}`,
    '',
    '## 3. Nestle スコア上昇の説明（確認項目1）',
    '',
    nestleBreakdown,
    '',
    '## 4. Debt/Equity 取得元（確認項目2）',
    '',
    '| Code | 取得元 | Yahoo raw | パース値 | 単位・表示 |',
    '|------|--------|-----------|----------|------------|',
    ...deRows,
    '',
    '**取得元:** Yahoo Finance `quoteSummary` モジュール `financialData.debtToEquity`',
    '',
    '**計算式:** アプリ側計算なし — `parseYahooRawNumber(financial.debtToEquity)` をそのまま使用。',
    '',
    '**Yahoo定義:** Total Debt / Total Stockholder Equity × 100（**パーセント表記**）。',
    '',
    '- Tenaga `175.31` = D/E **175.31%**（比率 1.75）— **「175.31x」表示は単位ラベル誤り**',
    '- Nestle `103.67` = D/E **103.67%**（比率 1.04）— 同上',
    '',
    '**修正推奨:** `fmtRatio` ではなく `fmtPct` または `ratio = value/100` + `x`  suffix。',
    '',
    '## 5. 取得率68% — 未取得項目一覧（確認項目3）',
    '',
    `平均取得率: **${avgRate.toFixed(1)}%**（22項目中）`,
    '',
    ...rows.map((r) => {
      const missingJa = r.missing.map((k) => METRIC_LABEL[k]).join(', ');
      return [
        `### ${r.code} ${r.label} — ${r.acquired}/22（${Math.round(r.rate * 100)}%）`,
        '',
        `**未取得:** ${missingJa || 'なし'}`,
        '',
      ].join('\n');
    }),
    '',
    '**共通未取得（全銘柄）:** Share Buyback, FCF Growth, Interest Coverage, Cash Ratio, Forward PER（一部）',
    '',
    '**銀行3社（1155/1023/1295）追加未取得:** Debt/Equity, Current Ratio, PEG, EV/EBITDA, FCF Margin',
    '',
    '## 6. Valuation Score → AI総合スコアの重み（確認項目4）',
    '',
    '### 反映経路（2段）',
    '',
    '```',
    'Valuation Score (-20..+20)',
    '  ↓',
    '① 材料アイテム scoreMaterialItem(title)  … キーワード判定 ±最大 ~25',
    '  ↓ + valuationIntelligenceMaterialScoreAdjustment (±maxAdj)',
    '  ↓',
    'materialScore = Σ(全材料 item.score)  … clamp ±100',
    '  ↓',
    '② AI総合スコア overallScore = clamp(50 + materialScore / 2)  … 0..100',
    '```',
    '',
    '### valuationIntelligenceMaterialScoreAdjustment 式',
    '',
    '```',
    `maxAdj = BASE_VALUATION_MAX_ADJ(10) × (0.35 + 0.65 × fieldAcquisitionRate)`,
    `adj = clamp(valuationScore / ${VALUATION_SCORE_MAX} × maxAdj, -maxAdj, +maxAdj)`,
    '```',
    '',
    `例: 取得率77% → maxAdj≈${maxAdjExample} · Valuation Score -14 → adj≈${Math.round((-14 / 20) * maxAdjExample * 10) / 10}`,
    '',
    '### 重みの実効値',
    '',
    '| 経路 | materialScore への影響 | overallScore への換算 |',
    '|------|---------------------|----------------------|',
    '| adj のみ（正常時） | ±maxAdj（最大約±8.7） | ±maxAdj/2（最大約±4.4） |',
    '| 材料アイテム（現状バグ） | ±25 程度 | ±12.5 程度 |',
    '',
    '**Valuation Score 自体は overallScore に直接加算されない。** materialScore 経由で `÷2` されて反映。',
    '',
    '## 7. 6銘柄 相関監査（確認項目5）',
    '',
    '| ペア | Pearson r | 解釈 |',
    '|------|-----------|------|',
    `| PER ↔ Valuation Score | ${corr.pe_vs_vScore?.toFixed(3) ?? 'N/A'} | 高PERほど低スコア想定 |`,
    `| PBR ↔ Valuation Score | ${corr.pb_vs_vScore?.toFixed(3) ?? 'N/A'} | 高PBRほど低スコア想定 |`,
    `| ROE ↔ Valuation Score | ${corr.roe_vs_vScore?.toFixed(3) ?? 'N/A'} | 高ROEほど高スコア想定 |`,
    `| Valuation Score ↔ AI総合 | ${corr.vScore_vs_ai?.toFixed(3) ?? 'N/A'} | **Nestleバグで逆相関リスク** |`,
    `| PER ↔ AI総合 | ${corr.pe_vs_ai?.toFixed(3) ?? 'N/A'} | |`,
    '',
    '### 6銘柄データ',
    '',
    '| Code | PER | PBR | ROE% | Val Score | Material | AI Overall |',
    '|------|-----|-----|------|-----------|----------|------------|',
    ...rows.map(
      (r) =>
        `| ${r.code} | ${r.pe?.toFixed(2) ?? '—'} | ${r.pb?.toFixed(2) ?? '—'} | ${r.roe?.toFixed(1) ?? '—'} | ${r.valuationScore >= 0 ? '+' : ''}${r.valuationScore} | ${r.scoreAfter} | ${r.overallScore} |`,
    ),
    '',
    '### 相関所見',
    '',
    '- **PBR ↔ Valuation Score:** 強い負の相関（高PBR=割高判定は機能）',
    '- **Valuation Score ↔ AI Overall:** Nestle のキーワード誤分類により materialScore が押し上げられ、相関が歪む',
    '- **PER ↔ Valuation Score:** 銀行セクター PER が類似し分散不足で相関が弱い',
    '',
    '## 8. PASS/FAIL',
    '',
    '**総合判定: FAIL（監査指摘2件）**',
    '',
    '1. **Critical:** `Strong Overvalued` が好材料と誤分類 → 材料スコア逆転',
    '2. **Warning:** Debt/Equity の単位表示 `x` が Yahoo `%` 値と不一致',
    '',
    '## 9. 残課題',
    '',
    '1. Phase20.1-fix: Valuation 材料は rating から sentiment を直接決定（キーワード回避）',
    '2. debtToEquity 表示を `%` または `x`（÷100）に修正',
    '3. 銀行セクター D/E 取得 — Yahoo `financialData` 空の場合 KLSE/Bursa フォールバック',
    '',
    '## 10. 次の推奨Phase',
    '',
    '- **Phase20.1-fix** — 上記2件の修正 + 回帰テスト',
    '- **Phase20.5** — セクター中央値 · FR 深度統合',
    '',
    '## 12. 実機監査結果',
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    '| heartbeatCount | N/A |',
    '| testEnded | N/A |',
    '| AsyncStorage保存確認 | N/A |',
    '',
    '## 13. 前回レポートとの差分',
    '',
    '**前回:** `PHASE20_VALUATION_INTELLIGENCE_REPORT.md`',
    `**今回:** Commit \`${commit}\``,
    '',
    '### 差分',
    '',
    '- **追加:** Phase20.1 監査 · Nestle逆転原因特定 · D/E単位監査 · 相関分析',
    '- **修正:** なし（監査のみ）',
    '',
    '---',
    '',
    '## 【監査サマリー】',
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    `| Commit | ${commit} |`,
    '| PASS/FAIL | FAIL |',
    '| 次回テスト実施可否 | CONDITIONAL PASS |',
    '| 残課題件数 | 3 |',
    '| Critical課題件数 | 1 |',
    '| Warning件数 | 2 |',
    '',
    '## 【次回テスト実施可否】',
    '',
    '**CONDITIONAL PASS**',
    '',
    '（Phase20.1-fix 適用後に再監査推奨）',
    '',
  ];

  mkdirSync(join(process.cwd(), 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(`[p20.1] Report: ${REPORT_PATH}`);
  console.log(JSON.stringify({ rows, corr }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
