/**
 * 最重要監査その18 — ADX20採用妥当性検証 · ADX>20 vs >25 · 2018〜 · 監査のみ
 */
import { FORWARD_ADX_MIN } from '../../constants/forwardValidation';
import type {
  ForwardAdx20ExtraTradeRow,
  ForwardAdx20ValidationAuditReport,
  ForwardAdx20ValidationMetrics,
  ForwardAdx20ValidationVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import {
  runAdxThresholdOperational,
} from './forwardValidationAdxSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const ADX20 = 20;
const ADX25 = FORWARD_ADX_MIN;

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

export function buildAdx20ValidationMetrics(
  labelJa: string,
  executed: ForwardPassedTradeRecord[],
): ForwardAdx20ValidationMetrics {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  return {
    labelJa,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
  };
}

export function buildAdx20ExtraTrades(
  adx20Executed: ForwardPassedTradeRecord[],
  adx25Executed: ForwardPassedTradeRecord[],
): {
  adx20Only: ForwardAdx20ExtraTradeRow[];
  adx25Only: ForwardAdx20ExtraTradeRow[];
} {
  const keys25 = new Set(adx25Executed.map((t) => t.id));
  const keys20 = new Set(adx20Executed.map((t) => t.id));

  const toRow = (t: ForwardPassedTradeRecord): ForwardAdx20ExtraTradeRow => ({
    symbol: t.symbol,
    signalDate: t.signalDate,
    returnPct: t.returnPct,
    holdDays: t.holdDays,
    adx14: t.adx14,
  });

  const adx20Only = adx20Executed
    .filter((t) => !keys25.has(t.id))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol))
    .map(toRow);

  const adx25Only = adx25Executed
    .filter((t) => !keys20.has(t.id))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol))
    .map(toRow);

  return { adx20Only, adx25Only };
}

/** 監査19/20 — 監査18の ADX20のみ実行トレード */
export function collectAdx20OnlyTrades(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardAdx20ExtraTradeRow[] {
  return collectAdx20OnlyFullTrades(bundle, fromDate, toDate).map((t) => ({
    symbol: t.symbol,
    signalDate: t.signalDate,
    returnPct: t.returnPct,
    holdDays: t.holdDays,
    adx14: t.adx14,
  }));
}

/** 監査20 — spyRegime等フルフィールド付き ADX20のみ実行 */
export function collectAdx20OnlyFullTrades(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const adx20Executed = runAdxThresholdOperational(bundle, fromDate, toDate, ADX20);
  const adx25Executed = runAdxThresholdOperational(bundle, fromDate, toDate, ADX25);
  const keys25 = new Set(adx25Executed.map((t) => t.id));
  return adx20Executed
    .filter((t) => !keys25.has(t.id))
    .sort(
      (a, b) =>
        a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
    );
}

export function evaluateAdx20Superiority(input: {
  adx20: ForwardAdx20ValidationMetrics;
  adx25: ForwardAdx20ValidationMetrics;
  adx20WithoutExtras: ForwardAdx20ValidationMetrics;
  extraTrades: ForwardAdx20ExtraTradeRow[];
  extraCumulativeReturnPct: number;
  sharedTradeCount: number;
}): {
  verdict: ForwardAdx20ValidationVerdict;
  verdictJa: string;
  superiorityDriverJa: string;
  extraContributionPct: number | null;
  cumulativeDeltaAdx20Vs25: number;
} {
  const {
    adx20,
    adx25,
    adx20WithoutExtras,
    extraTrades,
    extraCumulativeReturnPct,
    sharedTradeCount,
  } = input;

  const cumulativeDelta = round3(adx20.cumulativeReturnPct - adx25.cumulativeReturnPct);
  const extraContributionPct =
    cumulativeDelta > 0 && extraTrades.length > 0
      ? round3((extraCumulativeReturnPct / cumulativeDelta) * 100)
      : null;

  const withoutExtrasStillBetter =
    adx20WithoutExtras.cumulativeReturnPct >= adx25.cumulativeReturnPct &&
    adx20WithoutExtras.winRatePct >= adx25.winRatePct - 1;

  const withoutExtrasCumRatio =
    adx25.cumulativeReturnPct !== 0
      ? adx20WithoutExtras.cumulativeReturnPct / adx25.cumulativeReturnPct
      : null;

  let superiorityDriverJa: string;
  if (extraTrades.length === 0) {
    superiorityDriverJa = '追加トレードなし — ADX20/25の実行集合は同一。';
  } else if (withoutExtrasStillBetter) {
    superiorityDriverJa =
      `追加${extraTrades.length}件除外後もADX20優位（累積${adx20WithoutExtras.cumulativeReturnPct}% vs ${adx25.cumulativeReturnPct}% · ` +
      `勝率${adx20WithoutExtras.winRatePct}% vs ${adx25.winRatePct}%）。全体的改善。`;
  } else if (
    adx20WithoutExtras.cumulativeReturnPct < adx25.cumulativeReturnPct &&
    adx20.cumulativeReturnPct > adx25.cumulativeReturnPct
  ) {
    superiorityDriverJa =
      `追加${extraTrades.length}件がADX20優位の主因: 除外後累積${adx20WithoutExtras.cumulativeReturnPct}% < ADX25の${adx25.cumulativeReturnPct}%。` +
      `追加分累積+${extraCumulativeReturnPct}%が差${cumulativeDelta}%の${extraContributionPct ?? '—'}%を説明。`;
  } else if (withoutExtrasCumRatio != null && withoutExtrasCumRatio >= 0.95) {
    superiorityDriverJa =
      `追加${extraTrades.length}件は差分の一部（寄与${extraContributionPct ?? '—'}%）だが、` +
      `除外後も累積比${round3(withoutExtrasCumRatio * 100)}%で概ね同等。共有${sharedTradeCount}件ベースは改善幅小。`;
  } else {
    superiorityDriverJa =
      `混合: 追加${extraTrades.length}件累積+${extraCumulativeReturnPct}% · 除外後ADX20累積${adx20WithoutExtras.cumulativeReturnPct}%。`;
  }

  const extraWins = extraTrades.filter((t) => t.returnPct > 0).length;
  const extraWr =
    extraTrades.length > 0 ? round3((extraWins / extraTrades.length) * 100) : 0;

  if (withoutExtrasStillBetter && (extraContributionPct ?? 100) < 60) {
    return {
      verdict: 'genuine_adx20_superiority',
      verdictJa:
        `ADX20はたまたまではない: 追加${extraTrades.length}件除外後も累積・勝率でADX25を上回る。` +
        `追加分寄与${extraContributionPct ?? '—'}% — 全体的改善が主。`,
      superiorityDriverJa,
      extraContributionPct,
      cumulativeDeltaAdx20Vs25: cumulativeDelta,
    };
  }

  if (
    (extraContributionPct ?? 0) >= 70 &&
    adx20WithoutExtras.cumulativeReturnPct <= adx25.cumulativeReturnPct
  ) {
    return {
      verdict: 'extra_trades_driven',
      verdictJa:
        `ADX20優位は追加${extraTrades.length}件（勝率${extraWr}% · 累積+${extraCumulativeReturnPct}%）依存。` +
        `除外後はADX25が上（累積${adx25.cumulativeReturnPct}% vs ${adx20WithoutExtras.cumulativeReturnPct}%）。` +
        `数件の当たりトレードで良化した可能性が高い。`,
      superiorityDriverJa,
      extraContributionPct,
      cumulativeDeltaAdx20Vs25: cumulativeDelta,
    };
  }

  if ((extraContributionPct ?? 0) >= 40 && adx20.cumulativeReturnPct > adx25.cumulativeReturnPct) {
    return {
      verdict: 'marginal_extra_driven',
      verdictJa:
        `ADX20優位は追加${extraTrades.length}件が寄与${extraContributionPct}%と大きいが、` +
        `除外後累積${adx20WithoutExtras.cumulativeReturnPct}%（ADX25=${adx25.cumulativeReturnPct}%）。` +
        `部分的に追加トレード依存。`,
      superiorityDriverJa,
      extraContributionPct,
      cumulativeDeltaAdx20Vs25: cumulativeDelta,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合判定: ADX20累積${adx20.cumulativeReturnPct}% vs ADX25${adx25.cumulativeReturnPct}% · ` +
      `追加${extraTrades.length}件 · 除外後${adx20WithoutExtras.cumulativeReturnPct}%。${superiorityDriverJa}`,
    superiorityDriverJa,
    extraContributionPct,
    cumulativeDeltaAdx20Vs25: cumulativeDelta,
  };
}

export function auditAdx20Validation(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardAdx20ValidationAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const adx20Executed = runAdxThresholdOperational(input.bundle, fromDate, toDate, ADX20);
  const adx25Executed = runAdxThresholdOperational(input.bundle, fromDate, toDate, ADX25);

  const { adx20Only: extraTrades, adx25Only: adx25OnlyTrades } = buildAdx20ExtraTrades(
    adx20Executed,
    adx25Executed,
  );
  const keys25 = new Set(adx25Executed.map((t) => t.id));
  const adx20WithoutExtrasExecuted = adx20Executed.filter((t) => keys25.has(t.id));

  const keys20 = new Set(adx20Executed.map((t) => t.id));
  const sharedTradeCount = adx25Executed.filter((t) => keys20.has(t.id)).length;

  const adx20 = buildAdx20ValidationMetrics('ADX>20', adx20Executed);
  const adx25 = buildAdx20ValidationMetrics('ADX>25（現行）', adx25Executed);
  const netExecutionCountDelta = adx20.tradeCount - adx25.tradeCount;
  const adx20WithoutExtras = buildAdx20ValidationMetrics(
    'ADX>20（追加除外）',
    adx20WithoutExtrasExecuted,
  );

  const extraWins = extraTrades.filter((t) => t.returnPct > 0).length;
  const extraTradesWinRatePct =
    extraTrades.length > 0 ? round3((extraWins / extraTrades.length) * 100) : 0;
  const extraTradesCumulativeReturnPct = round3(
    extraTrades.reduce((s, t) => s + t.returnPct, 0),
  );

  const evaluation = evaluateAdx20Superiority({
    adx20,
    adx25,
    adx20WithoutExtras,
    extraTrades,
    extraCumulativeReturnPct: extraTradesCumulativeReturnPct,
    sharedTradeCount,
  });

  const verdictLabel: Record<ForwardAdx20ValidationVerdict, string> = {
    genuine_adx20_superiority: 'ADX20真の優位',
    extra_trades_driven: '追加件依存',
    marginal_extra_driven: '部分的追加依存',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その18】ADX20採用妥当性検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · ADX>20 vs >25 · ルール変更・最適化禁止',
    '',
    `■ 1. ADX20のみ追加トレード一覧（${extraTrades.length}件 · 実行件数差${netExecutionCountDelta}件）`,
    `※ ADX25のみ${adx25OnlyTrades.length}件は枠競合差。ネット件数差=${extraTrades.length}-${adx25OnlyTrades.length}=${netExecutionCountDelta}`,
    ...extraTrades.map(
      (t) =>
        `${t.symbol} · ${t.signalDate} · 利益${t.returnPct}% · 保有${t.holdDays}日 · ADX${t.adx14}`,
    ),
    extraTrades.length === 0 ? '（追加なし）' : '',
    '',
    `■ 2. 追加${extraTrades.length}件の勝率: ${extraTradesWinRatePct}%（${extraWins}/${extraTrades.length}）`,
    `■ 3. 追加${extraTrades.length}件の累積利益: ${extraTradesCumulativeReturnPct}%`,
    '',
    '■ 4. 追加除外後のADX20成績',
    `件数${adx20WithoutExtras.tradeCount} · 勝率${adx20WithoutExtras.winRatePct}% · 均R${adx20WithoutExtras.avgReturnPct ?? '—'}% · ` +
      `DD${adx20WithoutExtras.maxDrawdownPct ?? '—'}% · 累積${adx20WithoutExtras.cumulativeReturnPct}% · 効率${adx20WithoutExtras.profitEfficiency ?? '—'}`,
    '',
    '■ 参考: フル比較',
    `ADX>20: ${adx20.tradeCount}件 WR${adx20.winRatePct}% 累積${adx20.cumulativeReturnPct}%`,
    `ADX>25: ${adx25.tradeCount}件 WR${adx25.winRatePct}% 累積${adx25.cumulativeReturnPct}%`,
    `累積差: ${evaluation.cumulativeDeltaAdx20Vs25}% · 追加寄与: ${evaluation.extraContributionPct ?? '—'}% · 共有${sharedTradeCount}件`,
    '',
    '■ 5. 優位性の主因',
    evaluation.superiorityDriverJa,
    '',
    `■ 評価: 【${verdictLabel[evaluation.verdict]}】`,
    evaluation.verdictJa,
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    adx20,
    adx25,
    adx20WithoutExtras,
    extraTrades,
    adx25OnlyTrades,
    netExecutionCountDelta,
    extraTradesWinRatePct,
    extraTradesCumulativeReturnPct,
    cumulativeDeltaAdx20Vs25: evaluation.cumulativeDeltaAdx20Vs25,
    extraContributionPct: evaluation.extraContributionPct,
    sharedTradeCount,
    superiorityDriverJa: evaluation.superiorityDriverJa,
    verdict: evaluation.verdict,
    verdictJa: evaluation.verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runAdx20ValidationAudit(): Promise<ForwardAdx20ValidationAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditAdx20Validation({ bundle });
}

export function formatAdx20ValidationCsv(report: ForwardAdx20ValidationAuditReport): string {
  const metricRow = (m: ForwardAdx20ValidationMetrics) =>
    [
      m.labelJa,
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
      m.profitEfficiency ?? '',
    ].join(',');

  const extraRows = report.extraTrades.map((t) =>
    [t.symbol, t.signalDate, t.returnPct, t.holdDays, t.adx14].join(','),
  );

  return [
    'labelJa,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    metricRow(report.adx20),
    metricRow(report.adx25),
    metricRow(report.adx20WithoutExtras),
    '',
    'symbol,signalDate,returnPct,holdDays,adx14',
    ...extraRows,
    '',
    `extraTradesWinRatePct,${report.extraTradesWinRatePct}`,
    `extraTradesCumulativeReturnPct,${report.extraTradesCumulativeReturnPct}`,
    `cumulativeDeltaAdx20Vs25,${report.cumulativeDeltaAdx20Vs25}`,
    `extraContributionPct,${report.extraContributionPct ?? ''}`,
    `verdict,${report.verdict}`,
  ].join('\n');
}
