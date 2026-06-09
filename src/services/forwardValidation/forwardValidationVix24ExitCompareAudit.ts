/**
 * VIX≥24 38件 · 出口A〜E比較監査 — 反実仮想 · ルール変更なし
 */
import { FORWARD_HOLD_DAYS, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24ExitCompareAuditReport,
  ForwardVix24ExitCompareId,
  ForwardVix24ExitCompareRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, simulateExitFromEntry, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_BASE = 24;

const EXIT_DEFS: {
  id: ForwardVix24ExitCompareId;
  labelJa: string;
  takeProfitPct: number;
  isBaseline: boolean;
}[] = [
  { id: 'exitA', labelJa: '出口A +2%', takeProfitPct: 2, isBaseline: false },
  { id: 'exitB', labelJa: '出口B +2.5%', takeProfitPct: 2.5, isBaseline: false },
  { id: 'exitC', labelJa: '出口C +3%（現行）', takeProfitPct: 3, isBaseline: true },
  { id: 'exitD', labelJa: '出口D +3.5%', takeProfitPct: 3.5, isBaseline: false },
  { id: 'exitE', labelJa: '出口E +4%', takeProfitPct: 4, isBaseline: false },
];

type SimTrade = {
  returnPct: number;
  exitReason: 'take_profit' | 'max_hold';
  holdDays: number;
  maePct: number;
  mfePct: number;
};

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
  entryIdx: number,
  exitIdx: number,
  entryPrice: number,
): { maePct: number; mfePct: number } {
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

function selectVix24Cohort(
  bundle: ForwardOhlcvBundle,
  trades: ForwardPassedTradeRecord[],
): ForwardPassedTradeRecord[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= VIX_BASE;
  });
}

function simulateExit(
  bundle: ForwardOhlcvBundle,
  trade: ForwardPassedTradeRecord,
  takeProfitPct: number,
): SimTrade | null {
  const bars = bundle.etfBars[trade.symbol];
  const entryIdx = barIndexByDate(bars, trade.entryDate);
  if (entryIdx < 0) return null;
  const exit = simulateExitFromEntry(bars, entryIdx, FORWARD_HOLD_DAYS, takeProfitPct);
  if (!exit) return null;
  const exitIdx = barIndexByDate(bars, exit.exitDate);
  if (exitIdx < entryIdx) return null;
  const entryPrice = bars[entryIdx]!.close;
  const { maePct, mfePct } = computeMaeMfe(bars, entryIdx, exitIdx, entryPrice);
  return {
    returnPct: exit.returnPct,
    exitReason: exit.reason,
    holdDays: exitIdx - entryIdx,
    maePct,
    mfePct,
  };
}

function buildRow(
  def: (typeof EXIT_DEFS)[number],
  sims: SimTrade[],
): ForwardVix24ExitCompareRow {
  const wins = sims.filter((s) => s.returnPct > 0);
  const maxHold = sims.filter((s) => s.exitReason === 'max_hold');
  const returns = sims.map((s) => s.returnPct);
  return {
    exitId: def.id,
    labelJa: def.labelJa,
    takeProfitPct: def.takeProfitPct,
    isBaseline: def.isBaseline,
    tradeCount: sims.length,
    winCount: wins.length,
    winRatePct: sims.length > 0 ? round3((wins.length / sims.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    avgHoldDays: mean(sims.map((s) => s.holdDays)),
    maxHoldRatePct: sims.length > 0 ? round3((maxHold.length / sims.length) * 100) : 0,
    avgMaePct: mean(sims.map((s) => s.maePct)),
    avgMfePct: mean(sims.map((s) => s.mfePct)),
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardVix24ExitCompareRow[]): string[] {
  const cols = [
    { w: 18, h: '出口' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 7, h: 'Sharpe' },
    { w: 7, h: '保有日' },
    { w: 8, h: '25日満%' },
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
        r.avgHoldDays != null ? String(r.avgHoldDays) : '—',
        String(r.maxHoldRatePct),
        r.avgMaePct != null ? String(r.avgMaePct) : '—',
        r.avgMfePct != null ? String(r.avgMfePct) : '—',
      ]),
    ),
  ];
}

export function auditVix24ExitCompare(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24ExitCompareAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = selectVix24Cohort(input.bundle, passed.trades);

  const rows = EXIT_DEFS.map((def) => {
    const sims: SimTrade[] = [];
    for (const t of cohort) {
      const sim = simulateExit(input.bundle, t, def.takeProfitPct);
      if (sim) sims.push(sim);
    }
    return buildRow(def, sims);
  });

  const humanLines = [
    `【VIX≥24 出口比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 VIX≥${VIX_BASE} ${cohort.length}件 · 同一エントリー · 最大保有${FORWARD_HOLD_DAYS}営業日`,
    '出口A〜E: 利確%のみ変更（反実仮想 · 現行ルールは出口C +3%）',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 一覧比較',
    ...formatTable(rows),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: cohort.length,
    vixBase: VIX_BASE,
    maxHoldDays: FORWARD_HOLD_DAYS,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24ExitCompareCsv(report: ForwardVix24ExitCompareAuditReport): string {
  const header =
    'exit,takeProfitPct,tradeCount,winRatePct,avgReturnPct,sharpe,avgHoldDays,maxHoldRatePct,avgMaePct,avgMfePct,isBaseline';
  const body = report.rows.map((r) =>
    [
      r.labelJa,
      r.takeProfitPct,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.sharpe ?? '',
      r.avgHoldDays ?? '',
      r.maxHoldRatePct,
      r.avgMaePct ?? '',
      r.avgMfePct ?? '',
      r.isBaseline ? 1 : 0,
    ].join(','),
  );
  return [header, ...body].join('\n');
}
