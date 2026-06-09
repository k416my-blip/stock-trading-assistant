/**
 * 最重要監査その14 — 利確目標感度分析 · 実運用ルール固定 · 2018〜 · 監査のみ
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardTpTargetSensitivityAuditReport,
  ForwardTpTargetSensitivityRow,
  ForwardTpTargetSensitivityVerdict,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

export const TP_TARGET_SENSITIVITY_LEVELS = [2, 3, 4, 5, 6] as const;
const BASELINE_TP = FORWARD_TAKE_PROFIT_PCT;

const FIXED_CONDITIONS_JA =
  `VIX≥24 · ADX+MACD+52w+SPY63 · 同時3枠 · 1日1ETF · 最大${FORWARD_HOLD_DAYS}営業日 · 利確%のみ変更`;

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

export function buildTpTargetSensitivityRow(
  takeProfitPct: number,
  executed: ForwardPassedTradeRecord[],
): ForwardTpTargetSensitivityRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  return {
    takeProfitPct,
    labelJa: `+${takeProfitPct}%`,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
  };
}

export function evaluateTp3Robustness(rows: ForwardTpTargetSensitivityRow[]): {
  verdict: ForwardTpTargetSensitivityVerdict;
  verdictJa: string;
} {
  const row3 = rows.find((r) => r.takeProfitPct === BASELINE_TP);
  if (!row3 || rows.length === 0) {
    return { verdict: 'accidental_tp3', verdictJa: '+3%利確行が算出不可。' };
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

  const maxEff = Math.max(...efficiencyEligible.map((r) => r.profitEfficiency ?? 0), 0);
  const cumFloor = bestCumulative.cumulativeReturnPct * 0.85;
  const robustLevels = withTrades
    .filter(
      (r) =>
        r.winRatePct >= 80 &&
        r.cumulativeReturnPct >= cumFloor &&
        (r.profitEfficiency ?? 0) >= maxEff * 0.85,
    )
    .map((r) => r.takeProfitPct)
    .sort((a, b) => a - b);

  const is3BestCumulative = bestCumulative.takeProfitPct === BASELINE_TP;
  const is3BestEfficiency = bestEfficiency?.takeProfitPct === BASELINE_TP;
  const is3BestWinRate = bestWinRate.takeProfitPct === BASELINE_TP;
  const robustSpan =
    robustLevels.length > 0
      ? `${robustLevels[0]}%〜${robustLevels[robustLevels.length - 1]}%`
      : '—';

  if (is3BestCumulative && (is3BestEfficiency || is3BestWinRate)) {
    return {
      verdict: 'optimal_tp3',
      verdictJa:
        `+3%利確が単独最適に近い: 累積${row3.cumulativeReturnPct}% · 効率${row3.profitEfficiency ?? '—'} · ` +
        `勝率${row3.winRatePct}%が主要水準帯で最高水準。偶然選定ではない。`,
    };
  }

  if (robustLevels.includes(BASELINE_TP) && robustLevels.length >= 2) {
    const rankCum =
      [...withTrades]
        .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)
        .findIndex((r) => r.takeProfitPct === BASELINE_TP) + 1;
    return {
      verdict: 'robust_tp3',
      verdictJa:
        `+3%利確は「頑健範囲」内（${robustSpan}）: 勝率${row3.winRatePct}% · 累積${row3.cumulativeReturnPct}% · ` +
        `効率${row3.profitEfficiency ?? '—'}。単独最適ではないが、最高累積=+${bestCumulative.takeProfitPct}%` +
        `（${bestCumulative.cumulativeReturnPct}%）との差は許容。偶然選定ではない（累積順位 ${rankCum}/${withTrades.length}）。`,
    };
  }

  if (is3BestWinRate && row3.cumulativeReturnPct >= bestCumulative.cumulativeReturnPct * 0.85) {
    return {
      verdict: 'robust_tp3',
      verdictJa:
        `+3%利確は勝率${row3.winRatePct}%で最高水準 · 累積${row3.cumulativeReturnPct}%（最高+${bestCumulative.takeProfitPct}%=${bestCumulative.cumulativeReturnPct}%）。` +
        `リスク調整（勝率・効率）重視なら頑健選択。`,
    };
  }

  const cumRatio =
    bestCumulative.cumulativeReturnPct > 0
      ? row3.cumulativeReturnPct / bestCumulative.cumulativeReturnPct
      : 0;
  const winRateRank =
    [...withTrades].sort((a, b) => b.winRatePct - a.winRatePct).findIndex(
      (r) => r.takeProfitPct === BASELINE_TP,
    ) + 1;
  if (cumRatio >= 0.8 && winRateRank <= 2 && row3.winRatePct >= 88) {
    return {
      verdict: 'robust_tp3',
      verdictJa:
        `+3%利確は頑健なトレードオフ: 累積${row3.cumulativeReturnPct}%（最高+${bestCumulative.takeProfitPct}%の${round3(cumRatio * 100)}%）· ` +
        `勝率${row3.winRatePct}%（${winRateRank}位/${withTrades.length}）。` +
        `利確引上げで累積は+${round3(bestCumulative.cumulativeReturnPct - row3.cumulativeReturnPct)}%程度しか増えず勝率低下。偶然選定ではない。`,
    };
  }

  if (
    row3.cumulativeReturnPct < bestCumulative.cumulativeReturnPct * 0.75 &&
    !robustLevels.includes(BASELINE_TP)
  ) {
    return {
      verdict: 'accidental_tp3',
      verdictJa:
        `+3%利確は偶然選定の疑い: 最高累積=+${bestCumulative.takeProfitPct}%（${bestCumulative.cumulativeReturnPct}%）· ` +
        `3%は累積${row3.cumulativeReturnPct}%・勝率${row3.winRatePct}%と大幅劣後。` +
        `最適化由来の値の可能性。`,
    };
  }

  return {
    verdict: 'accidental_tp3',
    verdictJa:
      `+3%利確は単独最適ではない: 最高累積=+${bestCumulative.takeProfitPct}%（${bestCumulative.cumulativeReturnPct}%）· ` +
      `最高効率=+${bestEfficiency?.takeProfitPct ?? '—'} · 3%は累積${row3.cumulativeReturnPct}%・勝率${row3.winRatePct}%。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardTpTargetSensitivityRow[]): string[] {
  const cols = [
    { w: 6, h: '利確' },
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

export function auditTpTargetSensitivity(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardTpTargetSensitivityAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];

  const rows = TP_TARGET_SENSITIVITY_LEVELS.map((tp) => {
    const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate, tp);
    const filtered = filterVixGteTrades(allPassed, vixBars, 24);
    const executed = simulateOperationalTrades(filtered).executed;
    return buildTpTargetSensitivityRow(tp, executed);
  });

  const { verdict, verdictJa } = evaluateTp3Robustness(rows);

  const verdictLabel: Record<ForwardTpTargetSensitivityVerdict, string> = {
    optimal_tp3: '+3%が最適に近い',
    robust_tp3: '頑健範囲（3%含む）',
    accidental_tp3: '偶然選定の疑い',
  };

  const humanLines = [
    `【最重要監査その14】利確目標感度分析 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · 利確%比較のみ · ルール変更・最適化禁止',
    '',
    '■ 利確%別成績（実運用シミュレーション · 退出日変動により件数も変動）',
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
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    levels: [...TP_TARGET_SENSITIVITY_LEVELS],
    baselineTakeProfitPct: BASELINE_TP,
    rows,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runTpTargetSensitivityAudit(): Promise<ForwardTpTargetSensitivityAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditTpTargetSensitivity({ bundle });
}

export function formatTpTargetSensitivityCsv(
  report: ForwardTpTargetSensitivityAuditReport,
): string {
  const lines = [
    'takeProfitPct,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    ...report.rows.map((r) =>
      [
        r.takeProfitPct,
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
    `baselineTakeProfitPct,${report.baselineTakeProfitPct}`,
  ];
  return lines.join('\n');
}
