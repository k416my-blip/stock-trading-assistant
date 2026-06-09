/**
 * VIX閾値スイープ監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixThresholdSweepAuditReport,
  ForwardVixThresholdSweepRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_THRESHOLDS = [20, 22, 24, 25, 26, 28, 30, 32, 35] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function computeMaeMfe(
  bars: OhlcvBar[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): { maePct: number; mfePct: number } | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  const exitIdx = barIndexByDate(bars, exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || entryPrice <= 0) return null;

  let mae = 0;
  let mfe = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / entryPrice - 1) * 100;
    const highRet = (bars[i]!.high / entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
    if (highRet > mfe) mfe = highRet;
  }
  return { maePct: round3(mae), mfePct: round3(mfe) };
}

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  maePct: number | null;
  mfePct: number | null;
};

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => {
    const bars = bundle.etfBars[t.symbol];
    const excursion = computeMaeMfe(bars, t.entryDate, t.exitDate, t.entryPrice);
    return {
      ...t,
      vix: vixAtDate(vixBars, t.signalDate),
      maePct: excursion?.maePct ?? null,
      mfePct: excursion?.mfePct ?? null,
    };
  });
}

function buildRow(threshold: number, trades: EnrichedTrade[]): ForwardVixThresholdSweepRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  const maes = trades.map((t) => t.maePct).filter((v): v is number => v != null);
  const mfes = trades.map((t) => t.mfePct).filter((v): v is number => v != null);
  return {
    vixThreshold: threshold,
    labelJa: `VIX≥${threshold}`,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgMaePct: mean(maes),
    avgMfePct: mean(mfes),
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardVixThresholdSweepRow[]): string[] {
  const cols = [
    { w: 8, h: '閾値' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 7, h: 'Sharpe' },
    { w: 8, h: '25日満%' },
    { w: 7, h: '保有日' },
    { w: 8, h: '均MAE%' },
    { w: 8, h: '均MFE%' },
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
        r.sharpe != null ? String(r.sharpe) : '—',
        String(r.maxHoldRatePct),
        r.avgHoldDays != null ? String(r.avgHoldDays) : '—',
        r.avgMaePct != null ? String(r.avgMaePct) : '—',
        r.avgMfePct != null ? String(r.avgMfePct) : '—',
      ]),
    ),
  ];
}

export function auditVixThresholdSweep(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVixThresholdSweepAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);
  const vixMissing = enriched.filter((t) => t.vix == null).length;

  const rows = VIX_THRESHOLDS.map((th) =>
    buildRow(
      th,
      enriched.filter((t) => t.vix != null && t.vix >= th),
    ),
  );

  const humanLines = [
    `【VIX閾値スイープ監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · シグナル日VIX終値 · 現行出口+3%/25日`,
    vixMissing > 0 ? `※ VIX欠損 ${vixMissing}件` : '',
    'MAE/MFE=保有期間日次安値/高値ベース',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 一覧比較',
    ...formatTable(rows),
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    vixMissingCount: vixMissing,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVixThresholdSweepCsv(report: ForwardVixThresholdSweepAuditReport): string {
  const header =
    'vixThreshold,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgHoldDays,avgMaePct,avgMfePct';
  const body = report.rows.map((r) =>
    [
      r.vixThreshold,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.sharpe ?? '',
      r.maxHoldRatePct,
      r.avgHoldDays ?? '',
      r.avgMaePct ?? '',
      r.avgMfePct ?? '',
    ].join(','),
  );
  return [header, ...body].join('\n');
}
