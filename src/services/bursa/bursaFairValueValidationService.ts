/**
 * Phase21.6 — Fair Value Intelligence 妥当性検証
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type {
  BursaFairValueIntelligenceAnalysis,
  FairValueRecommendation,
} from '../../types/bursaFairValueIntelligence';
import {
  DCF_PROJECTION_YEARS,
  FAIR_VALUE_MODEL_LABEL_JA,
  recommendationFromFairValueScore,
  recommendationJa,
  resolveFairValueSector,
  SECTOR_FAIR_VALUE_PARAMS,
} from '../../constants/bursaFairValueIntelligence';
import {
  resolveValuationSector,
  SECTOR_VALUATION_BENCHMARKS,
} from '../../constants/bursaValuationIntelligence';
import {
  computeFairValueScore,
} from './bursaFairValueIntelligenceService';
import type { FairValueRawInputs } from './bursaFairValueIntelligenceProviders';
import type { FairValueIntelligenceSource, FairValueMetricKey } from '../../types/bursaFairValueIntelligence';

export const FAIR_VALUE_CONFIDENCE_CRITERIA_JA = [
  '**High**: 使用モデル2つ以上 かつ DCF/DDMのいずれかを含む かつ フィールド取得率≥70% かつ フォールバックソース≤2',
  '**Medium**: 使用モデル1つ以上 かつ フィールド取得率≥45%',
  '**Low**: 上記以外（PERのみ、または取得率<45%）',
] as const;

export type FairValueScoreBreakdown = {
  score: number;
  recommendation: FairValueRecommendation;
  stepsJa: string[];
};

export type DdmValidationInputs = {
  dividendPerShare: number | null;
  dividendYieldPct: number | null;
  dividendGrowthPct: number | null;
  requiredReturnPct: number;
  d1: number | null;
  formulaJa: string;
  sourceJa: string;
};

export type FairValueValidationDetail = {
  stockCode: string;
  avoidExplanationJa: string[];
  scoreBreakdown: FairValueScoreBreakdown;
  ddmInputs: DdmValidationInputs | null;
  formulaLinesJa: string[];
  confidenceCriteriaAppliedJa: string;
  analystTargetPrice: number | null;
  analystTargetSource: string;
  analystVsFairValueJa: string;
};

function normalizeYieldPct(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function fieldSourceLabel(source: FairValueIntelligenceSource | undefined): string {
  switch (source) {
    case 'yahoo_finance':
      return 'Yahoo Finance';
    case 'phase17_dividend':
      return 'Phase17 Dividend';
    case 'financial_report':
      return 'Financial Report';
    case 'bursa_disclosure':
      return 'Bursa Disclosure';
    default:
      return '未取得';
  }
}

export function explainFairValueScoreBreakdown(analysis: BursaFairValueIntelligenceAnalysis): FairValueScoreBreakdown {
  const steps: string[] = [];
  let running = 0;

  const upside = analysis.upsidePct;
  const mos = analysis.marginOfSafetyPct;
  const downside = analysis.downsidePct;

  if (upside != null) {
    let delta = 0;
    if (upside >= 30) delta = 8;
    else if (upside >= 15) delta = 5;
    else if (upside >= 5) delta = 2;
    else if (upside <= -30) delta = -8;
    else if (upside <= -15) delta = -5;
    else if (upside <= -5) delta = -2;
    running += delta;
    steps.push(
      `Upside ${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%（(適正−現在)/現在）→ ${delta >= 0 ? '+' : ''}${delta}点`,
    );
  }

  if (mos != null) {
    let delta = 0;
    if (mos >= 25) delta = 4;
    else if (mos >= 10) delta = 2;
    else if (mos <= -25) delta = -4;
    else if (mos <= -10) delta = -2;
    running += delta;
    steps.push(
      `Margin of Safety ${mos >= 0 ? '+' : ''}${mos.toFixed(1)}%（(適正−現在)/適正）→ ${delta >= 0 ? '+' : ''}${delta}点`,
    );
  }

  if (downside != null && downside >= 25) {
    running -= 3;
    steps.push(`Downside ${downside.toFixed(1)}%（レンジ下限までの下落余地≥25%）→ -3点`);
  }

  const score = computeFairValueScore({ upsidePct: upside, marginOfSafetyPct: mos, downsidePct: downside });
  const recommendation = recommendationFromFairValueScore(score);

  steps.push(`合計 Fair Value Score: ${score >= 0 ? '+' : ''}${score}（範囲 -20〜+20）`);
  steps.push(
    `推奨マッピング: ≥+12 Strong Buy / ≥+5 Buy / -5〜+5 Hold / ≤-5 Reduce / ≤-12 Avoid → **${recommendation}**`,
  );
  steps.push(`評価コメント: ${recommendationJa(recommendation)}`);

  return { score, recommendation, stepsJa: steps };
}

export function buildAvoidExplanationJa(
  analysis: BursaFairValueIntelligenceAnalysis,
  label: string,
): string[] {
  const lines: string[] = [];
  const d = analysis.displayJa;
  const breakdown = explainFairValueScoreBreakdown(analysis);

  lines.push(
    `**${label}（${analysis.recommendation}）** — 現在 ${d.currentPrice}、適正（Mid）${d.fairValueMid}、Range ${d.fairValueLow}〜${d.fairValueHigh}`,
  );
  lines.push(`使用モデル: ${d.modelsUsed}（主: ${d.primaryModel}）、信頼度: ${d.confidence}`);

  if (analysis.currentPrice != null && analysis.fairValueMid != null) {
    const premiumPct =
      ((analysis.currentPrice - analysis.fairValueMid) / analysis.fairValueMid) * 100;
    lines.push(
      `現在株価は適正Midより **+${premiumPct.toFixed(1)}% プレミアム**（割高）。`,
    );
  }

  lines.push('---');
  lines.push('**スコア内訳:**');
  lines.push(...breakdown.stepsJa.map((s) => `- ${s}`));

  if (analysis.recommendation === 'Avoid' || analysis.recommendation === 'Reduce') {
    lines.push('---');
    lines.push('**Avoid/Reduce 判定の要点:**');
    if (analysis.upsidePct != null && analysis.upsidePct <= -15) {
      lines.push(`- Upside が ${analysis.upsidePct.toFixed(1)}% と大幅マイナス → モデル平均適正株価を大きく上回る`);
    }
    if (analysis.marginOfSafetyPct != null && analysis.marginOfSafetyPct <= -25) {
      lines.push(`- MoS が ${analysis.marginOfSafetyPct.toFixed(1)}% → 安全余裕がなく割高`);
    }
    if (analysis.ddm?.fairPrice != null && analysis.currentPrice != null) {
      const ddmGap = ((analysis.currentPrice - analysis.ddm.fairPrice) / analysis.ddm.fairPrice) * 100;
      lines.push(`- DDM適正 RM ${analysis.ddm.fairPrice.toFixed(2)} 対 現在 → +${ddmGap.toFixed(1)}% プレミアム`);
    }
    if (analysis.per?.fairPrice != null && analysis.currentPrice != null) {
      const perGap = ((analysis.currentPrice - analysis.per.fairPrice) / analysis.per.fairPrice) * 100;
      lines.push(`- PER補完 RM ${analysis.per.fairPrice.toFixed(2)} 対 現在 → +${perGap.toFixed(1)}% プレミアム`);
    }
  }

  return lines;
}

export function buildDdmValidationInputs(input: {
  rawInputs: FairValueRawInputs;
  sector: string | null | undefined;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
  ddmFairPrice: number | null;
}): DdmValidationInputs | null {
  const yieldPct = normalizeYieldPct(input.rawInputs.dividendYield);
  const isDividend =
    (input.rawInputs.dividendPerShare != null && input.rawInputs.dividendPerShare > 0) ||
    (yieldPct != null && yieldPct > 0);
  if (!isDividend) return null;

  const params = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(input.sector)];
  const r = params.ddmRequiredReturn;
  const gPct = input.rawInputs.dividendGrowth;
  const g = gPct != null ? gPct / 100 : null;

  let d0: number | null = null;
  if (input.rawInputs.dividendPerShare != null && input.rawInputs.dividendPerShare > 0) {
    d0 = input.rawInputs.dividendPerShare;
  } else if (yieldPct != null && yieldPct > 0 && input.rawInputs.currentPrice != null) {
    d0 = input.rawInputs.currentPrice * (yieldPct / 100);
  }

  const d1 = d0 != null && g != null ? d0 * (1 + g) : null;
  const fairFromFormula = d1 != null && g != null && g < r - 0.02 ? d1 / (r - g) : null;

  const growthSource = fieldSourceLabel(input.fieldSources.dividendGrowth);
  const divSource = fieldSourceLabel(input.fieldSources.dividendYield);

  return {
    dividendPerShare: d0,
    dividendYieldPct: yieldPct,
    dividendGrowthPct: gPct,
    requiredReturnPct: r * 100,
    d1,
    formulaJa:
      d1 != null && gPct != null
        ? `P = D₁/(r−g) = ${d1.toFixed(4)}/(${(r * 100).toFixed(1)}%−${gPct.toFixed(1)}%) = RM ${fairFromFormula?.toFixed(2) ?? '算出不可'}`
        : 'Gordon Growth: 入力不足',
    sourceJa: `配当[${divSource}] · 成長率[${growthSource}] · r=セクター定数(${(r * 100).toFixed(1)}%)`,
  };
}

export function buildFairValueFormulaLinesJa(input: {
  analysis: BursaFairValueIntelligenceAnalysis;
  rawInputs: FairValueRawInputs;
  sector: string | null | undefined;
}): string[] {
  const { analysis, rawInputs, sector } = input;
  const lines: string[] = [];
  const sectorKey = resolveFairValueSector(sector);
  const params = SECTOR_FAIR_VALUE_PARAMS[sectorKey];
  const bench = SECTOR_VALUATION_BENCHMARKS[resolveValuationSector(sector)];

  if (analysis.dcf.fairPrice != null) {
    lines.push(
      `**DCF**: 5年FCF割引 + ターミナル値 / 株式数。割引率 ${(params.discountRate * 100).toFixed(1)}%、永久成長 ${(params.terminalGrowth * 100).toFixed(1)}%、投影 ${DCF_PROJECTION_YEARS}年 → RM ${analysis.dcf.fairPrice.toFixed(2)}`,
    );
    if (analysis.dcf.inputsUsedJa.length) {
      lines.push(`  入力: ${analysis.dcf.inputsUsedJa.join(' · ')}`);
    }
  } else {
    lines.push(`**DCF**: 未取得 — ${analysis.dcf.unavailableReasonJa ?? '—'}`);
  }

  if (analysis.ddm?.fairPrice != null) {
    const ddm = buildDdmValidationInputs({
      rawInputs,
      sector,
      fieldSources: analysis.fieldSources,
      ddmFairPrice: analysis.ddm.fairPrice,
    });
    lines.push(`**DDM (Gordon Growth)**: P = D₁/(r−g)`);
    if (ddm) {
      lines.push(`  D₀=${ddm.dividendPerShare?.toFixed(4) ?? '—'}, g=${ddm.dividendGrowthPct?.toFixed(1) ?? '—'}%, r=${ddm.requiredReturnPct.toFixed(1)}%`);
      lines.push(`  ${ddm.formulaJa} → RM ${analysis.ddm.fairPrice.toFixed(2)}`);
    }
  } else if (analysis.ddm) {
    lines.push(`**DDM**: 未取得 — ${analysis.ddm.unavailableReasonJa ?? '—'}`);
  } else {
    lines.push('**DDM**: 非配当銘柄');
  }

  if (analysis.per.fairPrice != null && rawInputs.trailingEps != null) {
    lines.push(
      `**PER補完**: EPS × セクター適正PER = ${rawInputs.trailingEps.toFixed(2)} × ${bench.pe.toFixed(1)} = RM ${analysis.per.fairPrice.toFixed(2)}`,
    );
  } else {
    lines.push(`**PER補完**: ${analysis.per.unavailableReasonJa ?? '未取得'}`);
  }

  const models = analysis.modelsUsed.map((m) => FAIR_VALUE_MODEL_LABEL_JA[m]).join(', ');
  lines.push(
    `**適正Mid**: 有効モデル（${models || 'なし'}）の算術平均 → RM ${analysis.fairValueMid?.toFixed(2) ?? '—'}`,
  );
  lines.push(
    `**Range**: Low=RM ${analysis.fairValueLow?.toFixed(2) ?? '—'} / High=RM ${analysis.fairValueHigh?.toFixed(2) ?? '—'}`,
  );

  return lines;
}

export function buildAnalystComparisonJa(input: {
  analysis: BursaFairValueIntelligenceAnalysis;
  analyst: BursaAnalystConsensusAnalysis | null | undefined;
}): { targetPrice: number | null; source: string; comparisonJa: string } {
  const target = input.analyst?.averageTargetPrice ?? null;
  const source = input.analyst?.source ?? 'none';
  const sourceLabel =
    source === 'yahoo_finance'
      ? 'Yahoo Finance'
      : source === 'fmp'
        ? 'FMP'
        : source === 'finnhub'
          ? 'Finnhub'
          : source === 'alpha_vantage'
            ? 'Alpha Vantage'
            : '未取得';

  if (target == null) {
    return {
      targetPrice: null,
      source: sourceLabel,
      comparisonJa: 'アナリスト目標株価: 未取得（APIキー未設定またはデータなし）',
    };
  }

  const current = input.analysis.currentPrice;
  const fair = input.analysis.fairValueMid;
  const parts: string[] = [
    `アナリスト目標株価: RM ${target.toFixed(2)} [${sourceLabel}]`,
  ];
  if (current != null) {
    const analystUpside = ((target - current) / current) * 100;
    parts.push(`対現在 Upside ${analystUpside >= 0 ? '+' : ''}${analystUpside.toFixed(1)}%`);
  }
  if (fair != null) {
    const fvGap = ((fair - target) / target) * 100;
    parts.push(
      `Fair Value Mid RM ${fair.toFixed(2)} vs アナリスト → ${fvGap >= 0 ? '+' : ''}${fvGap.toFixed(1)}%（Fair Valueがアナリスト目標より${fvGap >= 0 ? '高い' : '低い'}）`,
    );
  }

  return { targetPrice: target, source: sourceLabel, comparisonJa: parts.join(' · ') };
}

export function buildConfidenceAppliedJa(analysis: BursaFairValueIntelligenceAnalysis): string {
  const models = analysis.modelsUsed.length;
  const hasCore = analysis.modelsUsed.some((m) => m === 'dcf' || m === 'ddm');
  const rate = Math.round(analysis.fieldAcquisitionRate * 100);
  const fallbackCount = Object.values(analysis.fieldSources).filter(
    (s) =>
      s === 'financial_report' || s === 'bursa_disclosure' || s === 'phase17_dividend',
  ).length;

  return [
    `判定結果: **${analysis.confidence}**`,
    `根拠: モデル数=${models}、コア(DCF/DDM)=${hasCore ? 'あり' : 'なし'}、取得率=${rate}%、フォールバック=${fallbackCount}`,
    `基準: ${FAIR_VALUE_CONFIDENCE_CRITERIA_JA.join(' / ')}`,
  ].join('\n');
}

export function buildFairValueValidationDetail(input: {
  stockCode: string;
  label: string;
  sector: string | null | undefined;
  analysis: BursaFairValueIntelligenceAnalysis;
  rawInputs: FairValueRawInputs;
  analyst?: BursaAnalystConsensusAnalysis | null;
}): FairValueValidationDetail {
  const analystCmp = buildAnalystComparisonJa({ analysis: input.analysis, analyst: input.analyst });

  return {
    stockCode: input.stockCode,
    avoidExplanationJa: buildAvoidExplanationJa(input.analysis, input.label),
    scoreBreakdown: explainFairValueScoreBreakdown(input.analysis),
    ddmInputs: buildDdmValidationInputs({
      rawInputs: input.rawInputs,
      sector: input.sector,
      fieldSources: input.analysis.fieldSources,
      ddmFairPrice: input.analysis.ddm?.fairPrice ?? null,
    }),
    formulaLinesJa: buildFairValueFormulaLinesJa({
      analysis: input.analysis,
      rawInputs: input.rawInputs,
      sector: input.sector,
    }),
    confidenceCriteriaAppliedJa: buildConfidenceAppliedJa(input.analysis),
    analystTargetPrice: analystCmp.targetPrice,
    analystTargetSource: analystCmp.source,
    analystVsFairValueJa: analystCmp.comparisonJa,
  };
}

/** 妥当性検証 PASS 条件 */
export function evaluateFairValueValidationPass(input: {
  details: FairValueValidationDetail[];
  maybankCurrentPriceExpected?: number;
}): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { details } = input;

  if (details.length !== 6) {
    reasons.push(`対象銘柄数 ${details.length}/6`);
  }

  const maybank = details.find((d) => d.stockCode === '1155');
  const cimb = details.find((d) => d.stockCode === '1023');

  if (!maybank?.avoidExplanationJa.length) {
    reasons.push('Maybank 詳細説明なし');
  }
  if (!cimb?.avoidExplanationJa.length) {
    reasons.push('CIMB 詳細説明なし');
  }

  const allFormulas = details.every((d) => d.formulaLinesJa.length >= 3);
  if (!allFormulas) reasons.push('算出式不足');

  const ddmStocks = details.filter((d) => d.ddmInputs != null);
  if (ddmStocks.length < 4) {
    reasons.push(`DDM入力表示 ${ddmStocks.length}/6（期待: 配当銘柄で表示）`);
  }

  const analystFetched = details.filter((d) => d.analystTargetPrice != null).length;
  if (analystFetched < 1) {
    reasons.push('アナリスト目標株価が1件も取得できず');
  }

  const pass = reasons.length === 0;
  if (pass) reasons.push('全確認項目クリア');

  return { pass, reasons };
}

export type { FairValueRawInputs };
