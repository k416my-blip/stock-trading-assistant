/**
 * 最重要監査その11 — VIX閾値感度分析 · 実運用ルール固定 · 2018〜 · 監査のみ
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixSensitivityAuditReport,
  ForwardVixSensitivityRow,
  ForwardVixSensitivityVerdict,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

export const VIX_SENSITIVITY_THRESHOLDS = [20, 22, 24, 26, 28, 30] as const;
const BASELINE_THRESHOLD = 24;

const OPERATIONAL_RULES_JA =
  `同時3枠 · 1日1ETF(DGRO>VYM>SPLG>SCHD) · 利確+${FORWARD_TAKE_PROFIT_PCT}% · 最大${FORWARD_HOLD_DAYS}営業日`;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

export function filterVixGteTrades(
  trades: ForwardPassedTradeRecord[],
  vixBars: OhlcvBar[],
  threshold: number,
): ForwardPassedTradeRecord[] {
  return trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= threshold;
  });
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

export function buildVixSensitivityRow(
  threshold: number,
  executed: ForwardPassedTradeRecord[],
): ForwardVixSensitivityRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  return {
    vixThreshold: threshold,
    labelJa: `VIX≥${threshold}`,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
  };
}

export function evaluateVix24Optimality(rows: ForwardVixSensitivityRow[]): {
  verdict: ForwardVixSensitivityVerdict;
  verdictJa: string;
} {
  const row24 = rows.find((r) => r.vixThreshold === BASELINE_THRESHOLD);
  if (!row24 || rows.length === 0) {
    return { verdict: 'not_optimal_24', verdictJa: 'VIX24行が算出不可。' };
  }

  const withTrades = rows.filter((r) => r.tradeCount > 0);
  const bestCumulative = [...withTrades].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const efficiencyEligible = withTrades.filter(
    (r) => r.maxDrawdownPct != null && Math.abs(r.maxDrawdownPct) >= 10,
  );
  const bestEfficiency = [...efficiencyEligible]
    .filter((r) => r.profitEfficiency != null)
    .sort((a, b) => (b.profitEfficiency ?? 0) - (a.profitEfficiency ?? 0))[0];
  const bestWinRate = [...withTrades].sort((a, b) => b.winRatePct - a.winRatePct)[0]!;

  const maxEff = Math.max(...efficiencyEligible.map((r) => r.profitEfficiency ?? 0));
  const cumFloor = bestCumulative.cumulativeReturnPct * 0.85;
  const robustThresholds = withTrades
    .filter(
      (r) =>
        r.winRatePct >= 87 &&
        r.cumulativeReturnPct >= cumFloor &&
        (r.profitEfficiency ?? 0) >= maxEff * 0.85,
    )
    .map((r) => r.vixThreshold)
    .sort((a, b) => a - b);

  const is24BestCumulative = bestCumulative.vixThreshold === BASELINE_THRESHOLD;
  const is24BestEfficiency = bestEfficiency?.vixThreshold === BASELINE_THRESHOLD;
  const is24BestWinRate = bestWinRate.vixThreshold === BASELINE_THRESHOLD;
  const robustSpan =
    robustThresholds.length > 0
      ? `${robustThresholds[0]}〜${robustThresholds[robustThresholds.length - 1]}`
      : '—';

  if (is24BestCumulative && is24BestEfficiency && is24BestWinRate) {
    return {
      verdict: 'optimal_24',
      verdictJa:
        `VIX≥24が単独最適に近い: 累積${row24.cumulativeReturnPct}% · 効率${row24.profitEfficiency ?? '—'} · ` +
        `勝率${row24.winRatePct}%が主要閾値帯で最高水準。`,
    };
  }

  if (
    robustThresholds.includes(BASELINE_THRESHOLD) &&
    robustThresholds.length >= 2
  ) {
    const rankCum =
      [...withTrades]
        .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)
        .findIndex((r) => r.vixThreshold === BASELINE_THRESHOLD) + 1;
    const is24BestEffInBand = bestEfficiency?.vixThreshold === BASELINE_THRESHOLD;
    return {
      verdict: 'robust_range',
      verdictJa:
        `VIX≥24は「頑健範囲」内（${robustSpan}）: 勝率${row24.winRatePct}% · 累積${row24.cumulativeReturnPct}% · ` +
        `効率${row24.profitEfficiency ?? '—'}${is24BestEffInBand ? '（|DD|≥10%帯で最高）' : ''}。` +
        `単独最適ではないが、最高累積=VIX≥${bestCumulative.vixThreshold}（${bestCumulative.cumulativeReturnPct}%）との差は許容。` +
        `（累積順位 ${rankCum}/${withTrades.length}）`,
    };
  }

  if (is24BestWinRate && !is24BestCumulative) {
    return {
      verdict: 'robust_range',
      verdictJa:
        `VIX≥24は勝率${row24.winRatePct}%で最高だが、累積はVIX≥${bestCumulative.vixThreshold}（${bestCumulative.cumulativeReturnPct}%）が上。` +
        `リスク調整（勝率・効率）重視なら24は頑健選択。`,
    };
  }

  return {
    verdict: 'not_optimal_24',
    verdictJa:
      `VIX≥24は単独最適ではない: 最高累積=VIX≥${bestCumulative.vixThreshold}（${bestCumulative.cumulativeReturnPct}%）· ` +
      `最高効率=VIX≥${bestEfficiency?.vixThreshold ?? '—'} · 24は累積${row24.cumulativeReturnPct}%・勝率${row24.winRatePct}%。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardVixSensitivityRow[]): string[] {
  const cols = [
    { w: 8, h: '閾値' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
    { w: 8, h: '効率' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) =>
      line([
        r.labelJa,
        String(r.tradeCount),
        String(r.winRatePct),
        r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
        r.maxDrawdownPct != null ? String(r.maxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
        r.profitEfficiency != null ? String(r.profitEfficiency) : '—',
      ]),
    ),
  ];
}

export function auditVixSensitivity(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardVixSensitivityAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];
  const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate);

  const rows = VIX_SENSITIVITY_THRESHOLDS.map((threshold) => {
    const filtered = filterVixGteTrades(allPassed, vixBars, threshold);
    const executed = simulateOperationalTrades(filtered).executed;
    return buildVixSensitivityRow(threshold, executed);
  });

  const { verdict, verdictJa } = evaluateVix24Optimality(rows);

  const verdictLabel: Record<ForwardVixSensitivityVerdict, string> = {
    optimal_24: 'VIX24が最適に近い',
    robust_range: '頑健範囲（24含む）',
    not_optimal_24: 'VIX24単独最適ではない',
  };

  const humanLines = [
    `【最重要監査その11】VIX閾値感度分析 ${fromDate} ～ ${toDate}`,
    `実運用ルール: ${OPERATIONAL_RULES_JA}`,
    '監査のみ · 閾値比較のみ · ルール変更・最適化禁止',
    '',
    '■ 閾値別成績（実運用シミュレーション後）',
    ...formatTable(rows),
    '',
    '■ 利益効率 = 累積利益率 ÷ |最大DD|',
    ...rows.map(
      (r) =>
        `${r.labelJa}: 効率${r.profitEfficiency ?? '—'}（累積${r.cumulativeReturnPct}% / DD${r.maxDrawdownPct ?? '—'}%）`,
    ),
    '',
    `■ 評価: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    operationalRulesJa: OPERATIONAL_RULES_JA,
    thresholds: [...VIX_SENSITIVITY_THRESHOLDS],
    rows,
    baselineThreshold: BASELINE_THRESHOLD,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runVixSensitivityAudit(): Promise<ForwardVixSensitivityAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditVixSensitivity({ bundle });
}

export function formatVixSensitivityCsv(report: ForwardVixSensitivityAuditReport): string {
  const lines = [
    'vixThreshold,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    ...report.rows.map((r) =>
      [
        r.vixThreshold,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.profitEfficiency ?? '',
      ].join(','),
    ),
    '',
    `verdict,${report.verdict}`,
    `baselineThreshold,${report.baselineThreshold}`,
  ];
  return lines.join('\n');
}
