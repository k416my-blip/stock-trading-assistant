/**
 * Phase21.7 — Fair Value Model Validation（アナリスト乖離・DDM g 調査）
 */
import type { BursaAnalystConsensusAnalysis } from '../../types/bursaAnalystConsensus';
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { BursaFairValueIntelligenceAnalysis } from '../../types/bursaFairValueIntelligence';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import {
  resolveFairValueSector,
  SECTOR_FAIR_VALUE_PARAMS,
} from '../../constants/bursaFairValueIntelligence';
import { computeDdmFairPrice } from './bursaFairValueIntelligenceService';
import type { FairValueRawInputs } from './bursaFairValueIntelligenceProviders';
import { resolveDdmGrowthRate } from './bursaDdmGrowthResolver';
import { buildBursaFiveYearTrend, type BursaFiveYearPoint } from './bursaTrendAnalysis';

export type GrowthHorizonValue = {
  valuePct: number | null;
  sourceJa: string;
  detailJa: string;
};

export type DividendGrowthHorizons = {
  oneYear: GrowthHorizonValue;
  threeYearAvg: GrowthHorizonValue;
  fiveYearAvg: GrowthHorizonValue;
  financialReportProfitYoY: GrowthHorizonValue;
  adoptedInDdm: GrowthHorizonValue;
};

export type AnalystDivergenceBand =
  | 'within_10'
  | 'within_20'
  | 'within_30'
  | 'beyond_30'
  | 'no_analyst';

export type FairValueModelValidationRow = {
  stockCode: string;
  label: string;
  sector: string;
  fairValueMid: number | null;
  analystTarget: number | null;
  analystSource: string;
  divergencePct: number | null;
  divergenceBand: AnalystDivergenceBand;
  divergenceBandJa: string;
  growthHorizons: DividendGrowthHorizons;
  bankNegativeGrowthExplanationJa: string[];
  perpetualGrowthAssessmentJa: string[];
  conservativeBiasContributionJa: string[];
};

const BANK_CODES = new Set(['1155', '1023', '1295']);

function cagrPct(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  const v = (Math.pow(end / start, 1 / years) - 1) * 100;
  return Number.isFinite(v) ? v : null;
}

function dividendPointsWithData(points: BursaFiveYearPoint[]): BursaFiveYearPoint[] {
  return points.filter((p) => p.dividend != null && p.dividend > 0);
}

function growthFromAnnualDividends(points: BursaFiveYearPoint[]): GrowthHorizonValue {
  const divs = dividendPointsWithData(points);
  if (divs.length < 2) {
    return { valuePct: null, sourceJa: 'Bursa配当履歴', detailJa: '年次配当2年分以上なし' };
  }
  const prev = divs[divs.length - 2];
  const last = divs[divs.length - 1];
  const value = ((last.dividend! - prev.dividend!) / prev.dividend!) * 100;
  return {
    valuePct: value,
    sourceJa: 'Bursa配当履歴（年次合計YoY）',
    detailJa: `${prev.year}年 RM${prev.dividend!.toFixed(3)} → ${last.year}年 RM${last.dividend!.toFixed(3)}`,
  };
}

function threeYearDividendCagr(points: BursaFiveYearPoint[]): GrowthHorizonValue {
  const divs = dividendPointsWithData(points);
  if (divs.length < 4) {
    return { valuePct: null, sourceJa: 'Bursa配当履歴', detailJa: '3年CAGR算出に4年分以上の配当データが必要' };
  }
  const start = divs[divs.length - 4];
  const end = divs[divs.length - 1];
  const years = end.year - start.year;
  const value = cagrPct(start.dividend!, end.dividend!, years > 0 ? years : 3);
  return {
    valuePct: value,
    sourceJa: 'Bursa配当履歴（3年CAGR）',
    detailJa: `${start.year}→${end.year}（${years}年）RM${start.dividend!.toFixed(3)}→RM${end.dividend!.toFixed(3)}`,
  };
}

function fiveYearDividendCagr(points: BursaFiveYearPoint[]): GrowthHorizonValue {
  const divs = dividendPointsWithData(points);
  if (divs.length < 2) {
    return { valuePct: null, sourceJa: 'Bursa配当履歴', detailJa: '5年CAGR算出不可' };
  }
  const start = divs[0];
  const end = divs[divs.length - 1];
  const years = end.year - start.year;
  const value = cagrPct(start.dividend!, end.dividend!, years > 0 ? years : divs.length - 1);
  return {
    valuePct: value,
    sourceJa: 'Bursa配当履歴（5年CAGR）',
    detailJa: `${start.year}→${end.year} RM${start.dividend!.toFixed(3)}→RM${end.dividend!.toFixed(3)}`,
  };
}

function growthFromFinancialReport(fr: FinancialReportAnalysis | null | undefined): GrowthHorizonValue {
  const profit = fr?.extracted.profitGrowth;
  if (profit?.growthPct == null) {
    return { valuePct: null, sourceJa: 'Financial Report', detailJa: '四半期純利益YoY未取得' };
  }
  return {
    valuePct: profit.growthPct,
    sourceJa: 'Financial Report（四半期純利益YoY）',
    detailJa: profit.growthLabelJa || `Current ${profit.currentQuarter ?? '—'} vs PY ${profit.priorYearQuarter ?? '—'}`,
  };
}

function sourceLabelFromField(source: string | undefined): string {
  switch (source) {
    case 'financial_report':
      return 'Financial Report';
    case 'phase17_dividend':
      return 'Phase17 Dividend';
    case 'bursa_disclosure':
      return 'Bursa Disclosure';
    case 'yahoo_finance':
      return 'Yahoo Finance';
    default:
      return source ?? '未取得';
  }
}

export function buildDividendGrowthHorizons(input: {
  bundle: BursaDisclosureBundle;
  financialReport: FinancialReportAnalysis | null | undefined;
  dividendIntelligence: BursaDividendIntelligenceAnalysis | null | undefined;
  mergedInputs: FairValueRawInputs;
  fieldSource?: string;
  sector?: string | null;
}): DividendGrowthHorizons {
  const trend = buildBursaFiveYearTrend(input.bundle);
  const frGrowth = growthFromFinancialReport(input.financialReport);
  const div1y = growthFromAnnualDividends(trend.points);
  const div3y = threeYearDividendCagr(trend.points);
  const div5yFromHistory = fiveYearDividendCagr(trend.points);

  const phase17Cagr = input.dividendIntelligence?.fiveYearCagr;
  const fiveYearAvg: GrowthHorizonValue =
    phase17Cagr != null
      ? {
          valuePct: phase17Cagr,
          sourceJa: 'Phase17 Dividend（5Y CAGR）',
          detailJa: input.dividendIntelligence?.displayJa.fiveYearCagr ?? `${phase17Cagr.toFixed(1)}%`,
        }
      : div5yFromHistory;

  const oneYear: GrowthHorizonValue =
    div1y.valuePct != null
      ? div1y
      : frGrowth.valuePct != null
        ? frGrowth
        : {
            valuePct: input.dividendIntelligence?.dividendGrowthRate ?? null,
            sourceJa: 'Phase17 Dividend（増配率）',
            detailJa:
              input.dividendIntelligence?.dividendGrowthRate != null
                ? `増配率 ${input.dividendIntelligence.dividendGrowthRate.toFixed(1)}%`
                : '未取得',
          };

  const adoptedSource = sourceLabelFromField(input.fieldSource);
  const resolved = resolveDdmGrowthRate({
    bundle: input.bundle,
    financialReport: input.financialReport,
    dividendIntelligence: input.dividendIntelligence,
    sector: input.sector,
  });

  return {
    oneYear,
    threeYearAvg: div3y,
    fiveYearAvg,
    financialReportProfitYoY: frGrowth,
    adoptedInDdm: {
      valuePct: resolved.adoptedPct,
      sourceJa: resolved.sourceJa,
      detailJa: resolved.clipApplied
        ? `${resolved.sourceJa} raw=${resolved.rawPct?.toFixed(1)}% → ${resolved.clippedPct?.toFixed(1)}%（${resolved.clipReasonJa}）`
        : `${resolved.sourceJa} g=${resolved.adoptedPct?.toFixed(1) ?? '—'}%`,
    },
  };
}

export function explainBankNegativeGrowthJa(input: {
  stockCode: string;
  label: string;
  horizons: DividendGrowthHorizons;
  financialReport: FinancialReportAnalysis | null | undefined;
}): string[] {
  if (!BANK_CODES.has(input.stockCode)) return [];

  const lines: string[] = [
    `**${input.label}（${input.stockCode}）— g≈-3%台の原因**`,
  ];
  const adopted = input.horizons.adoptedInDdm;
  const fr = growthFromFinancialReport(input.financialReport);

  lines.push(
    `- DDM採用 g=${adopted.valuePct?.toFixed(1) ?? '—'}% の算出元: **${adopted.sourceJa}**`,
  );
  lines.push(
    '- **根本原因**: Phase21.5 フォールバック順（Yahoo→FR→Bursa→Phase17）で、Financial Report の **四半期純利益YoY** が `dividendGrowth` に先に設定され、配当CAGRより優先されている',
  );
  if (fr.valuePct != null) {
    lines.push(
      `- FR 純利益成長: **${fr.valuePct.toFixed(1)}%**（${fr.detailJa}）— 単期の利益減を永久成長率 g として DDM に流用`,
    );
  }
  const div5 = input.horizons.fiveYearAvg;
  if (div5.valuePct != null && adopted.valuePct != null && div5.valuePct > adopted.valuePct + 2) {
    lines.push(
      `- 配当ベース5年CAGR（${div5.valuePct.toFixed(1)}% [${div5.sourceJa}]）と採用 g（${adopted.valuePct.toFixed(1)}%）に **${(div5.valuePct - adopted.valuePct).toFixed(1)}pt の乖離** — 配当トレンドより悲観的`,
    );
  }
  lines.push(
    '- Gordon Growth では g が低い/負ほど D₁/(r−g) の分母が縮小し適正株価は**下方** → アナリスト目標との乖離を拡大しやすい',
  );
  return lines;
}

export function assessPerpetualGrowthJa(input: {
  gPct: number | null;
  sector: string | null | undefined;
  horizons: DividendGrowthHorizons;
}): string[] {
  const sectorKey = resolveFairValueSector(input.sector);
  const terminal = SECTOR_FAIR_VALUE_PARAMS[sectorKey].terminalGrowth * 100;
  const lines: string[] = [];

  if (input.gPct == null) {
    lines.push('永久成長率 g: 未取得 → 評価不可');
    return lines;
  }

  lines.push(`採用 g=${input.gPct.toFixed(1)}% vs セクター永久成長定数 ${terminal.toFixed(1)}%`);

  if (input.gPct < 0) {
    lines.push('**不適切（永久成長として）**: g<0 は配当の恒久減少を意味し Gordon モデルの前提に反する');
    lines.push('単期利益YoYのマイナスを g に使うと DDM が過度に保守的になる');
  } else if (input.gPct < terminal - 1) {
    lines.push(`**やや不適切**: g がターミナル成長（${terminal.toFixed(1)}%）を大きく下回る — 長期成長を過小評価`);
  } else if (input.gPct <= terminal + 3) {
    lines.push('**妥当圏**: g がセクター永久成長定数付近 — 永久成長 proxy として許容範囲');
  } else {
    const params = SECTOR_FAIR_VALUE_PARAMS[sectorKey];
    if (input.gPct / 100 >= params.ddmRequiredReturn - 0.02) {
      lines.push('**不適切**: g が要求収益率 r に近すぎ — DDM 算出不可または不安定');
    } else {
      lines.push('**注意**: g が高め — 持続可能性要確認');
    }
  }

  const alt5 = input.horizons.fiveYearAvg.valuePct;
  if (alt5 != null && Math.abs(alt5 - input.gPct) >= 5) {
    lines.push(
      `5年平均 g 候補（${alt5.toFixed(1)}%）との差 ${(alt5 - input.gPct).toFixed(1)}pt — 採用 g の見直し余地あり`,
    );
  }
  return lines;
}

export function classifyAnalystDivergence(divergencePct: number | null): {
  band: AnalystDivergenceBand;
  bandJa: string;
} {
  if (divergencePct == null) {
    return { band: 'no_analyst', bandJa: 'アナリスト目標未取得' };
  }
  const abs = Math.abs(divergencePct);
  if (abs <= 10) return { band: 'within_10', bandJa: '±10%以内' };
  if (abs <= 20) return { band: 'within_20', bandJa: '±10〜20%' };
  if (abs <= 30) return { band: 'within_30', bandJa: '±20〜30%' };
  return { band: 'beyond_30', bandJa: '±30%超' };
}

export function computeAnalystDivergencePct(
  fairValueMid: number | null,
  analystTarget: number | null,
): number | null {
  if (fairValueMid == null || analystTarget == null || analystTarget <= 0) return null;
  return ((fairValueMid - analystTarget) / analystTarget) * 100;
}

export function buildConservativeBiasContributionJa(input: {
  divergencePct: number | null;
  horizons: DividendGrowthHorizons;
  ddmFairPrice: number | null;
  rawInputs: FairValueRawInputs;
  sector: string | null | undefined;
  currentPrice: number | null;
}): string[] {
  const lines: string[] = [];
  if (input.divergencePct != null && input.divergencePct < -10) {
    lines.push(`Fair Value がアナリストより ${input.divergencePct.toFixed(1)}% 低い → 保守寄与`);
  }
  if (input.horizons.adoptedInDdm.valuePct != null && input.horizons.adoptedInDdm.valuePct < 0) {
    lines.push('負の g 採用 → DDM 適正を押し下げ');
  }
  const altG = input.horizons.fiveYearAvg.valuePct;
  if (
    altG != null &&
    input.horizons.adoptedInDdm.valuePct != null &&
    input.currentPrice != null &&
    input.rawInputs.dividendPerShare != null
  ) {
    const params = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(input.sector)];
    const fairAlt = computeDdmFairPrice({
      currentPrice: input.currentPrice,
      dividendPerShare: input.rawInputs.dividendPerShare,
      dividendYieldPct: input.rawInputs.dividendYield,
      dividendGrowthPct: altG,
      requiredReturn: params.ddmRequiredReturn,
    });
    if (fairAlt != null && input.ddmFairPrice != null && fairAlt > input.ddmFairPrice * 1.15) {
      lines.push(
        `5年配当CAGR g=${altG.toFixed(1)}% で再計算 DDM→RM ${fairAlt.toFixed(2)}（現行 RM ${input.ddmFairPrice.toFixed(2)}）`,
      );
    }
  }
  if (lines.length === 0) lines.push('大きな保守寄与なし、またはアナリスト乖離が小さい');
  return lines;
}

export type ConservativeBiasVerdict = {
  exists: boolean;
  verdictJa: string;
  avgDivergencePct: number | null;
  stocksBeyond30Pct: number;
  stocksBelowAnalyst20Pct: number;
};

export function evaluateConservativeBias(rows: FairValueModelValidationRow[]): ConservativeBiasVerdict {
  const withAnalyst = rows.filter((r) => r.divergencePct != null);
  if (withAnalyst.length === 0) {
    return {
      exists: false,
      verdictJa: 'アナリストデータ不足のため判定不可',
      avgDivergencePct: null,
      stocksBeyond30Pct: 0,
      stocksBelowAnalyst20Pct: 0,
    };
  }

  const avg =
    withAnalyst.reduce((s, r) => s + (r.divergencePct ?? 0), 0) / withAnalyst.length;
  const beyond30 = withAnalyst.filter((r) => r.divergenceBand === 'beyond_30').length;
  const below20 = withAnalyst.filter((r) => (r.divergencePct ?? 0) <= -20).length;

  const exists = avg <= -25 || below20 >= 4 || beyond30 >= 4;
  return {
    exists,
    verdictJa: exists
      ? `**Conservative Bias あり** — 平均乖離 ${avg.toFixed(1)}%、20%以上低い銘柄 ${below20}/${withAnalyst.length}、±30%超 ${beyond30}/${withAnalyst.length}`
      : `Conservative Bias **なし/弱** — 平均乖離 ${avg.toFixed(1)}%`,
    avgDivergencePct: avg,
    stocksBeyond30Pct: beyond30,
    stocksBelowAnalyst20Pct: below20,
  };
}

export function buildFairValueModelValidationRow(input: {
  stockCode: string;
  label: string;
  sector: string;
  analysis: BursaFairValueIntelligenceAnalysis;
  rawInputs: FairValueRawInputs;
  bundle: BursaDisclosureBundle;
  financialReport: FinancialReportAnalysis | null | undefined;
  dividendIntelligence: BursaDividendIntelligenceAnalysis | null | undefined;
  analyst: BursaAnalystConsensusAnalysis | null | undefined;
}): FairValueModelValidationRow {
  const horizons = buildDividendGrowthHorizons({
    bundle: input.bundle,
    financialReport: input.financialReport,
    dividendIntelligence: input.dividendIntelligence,
    mergedInputs: input.rawInputs,
    fieldSource: input.analysis.fieldSources.dividendGrowth,
    sector: input.sector,
  });

  const analystTarget = input.analyst?.averageTargetPrice ?? null;
  const analystSource =
    input.analyst?.source === 'yahoo_finance'
      ? 'Yahoo Finance'
      : input.analyst?.source === 'fmp'
        ? 'FMP'
        : input.analyst?.source ?? '未取得';

  const divergencePct = computeAnalystDivergencePct(input.analysis.fairValueMid, analystTarget);
  const { band, bandJa } = classifyAnalystDivergence(divergencePct);

  return {
    stockCode: input.stockCode,
    label: input.label,
    sector: input.sector,
    fairValueMid: input.analysis.fairValueMid,
    analystTarget,
    analystSource,
    divergencePct,
    divergenceBand: band,
    divergenceBandJa: bandJa,
    growthHorizons: horizons,
    bankNegativeGrowthExplanationJa: explainBankNegativeGrowthJa({
      stockCode: input.stockCode,
      label: input.label,
      horizons,
      financialReport: input.financialReport,
    }),
    perpetualGrowthAssessmentJa: assessPerpetualGrowthJa({
      gPct: horizons.adoptedInDdm.valuePct,
      sector: input.sector,
      horizons,
    }),
    conservativeBiasContributionJa: buildConservativeBiasContributionJa({
      divergencePct,
      horizons,
      ddmFairPrice: input.analysis.ddm?.fairPrice ?? null,
      rawInputs: input.rawInputs,
      sector: input.sector,
      currentPrice: input.analysis.currentPrice,
    }),
  };
}

export function evaluateModelValidationPass(rows: FairValueModelValidationRow[]): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (rows.length !== 6) reasons.push(`銘柄数 ${rows.length}/6`);

  const banks = rows.filter((r) => BANK_CODES.has(r.stockCode));
  if (banks.length !== 3 || banks.some((b) => b.bankNegativeGrowthExplanationJa.length === 0)) {
    reasons.push('銀行3銘柄 g 説明不足');
  }

  const analystOk = rows.filter((r) => r.analystTarget != null).length >= 4;
  if (!analystOk) reasons.push('アナリスト目標不足');

  const pass = reasons.length === 0;
  if (pass) reasons.push('全確認項目クリア');
  return { pass, reasons };
}
