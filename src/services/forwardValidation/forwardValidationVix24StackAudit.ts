/**
 * VIX≥24 基準スタック比較監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24StackAuditReport,
  ForwardVix24StackId,
  ForwardVix24StackRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_BASE = 24;
const DIST52_THRESHOLD = -10;
const MACD_THRESHOLD = 0.25;
const ADX_THRESHOLD = 30;

type StackDef = {
  id: ForwardVix24StackId;
  labelJa: string;
  needsDist52: boolean;
  needsMacd: boolean;
  needsAdx: boolean;
};

const STACKS: StackDef[] = [
  { id: 's1', labelJa: '① VIX≥24', needsDist52: false, needsMacd: false, needsAdx: false },
  { id: 's2', labelJa: '② VIX≥24+52週≤-10%', needsDist52: true, needsMacd: false, needsAdx: false },
  { id: 's3', labelJa: '③ VIX≥24+MACD≥0.25', needsDist52: false, needsMacd: true, needsAdx: false },
  { id: 's4', labelJa: '④ VIX≥24+ADX≥30', needsDist52: false, needsMacd: false, needsAdx: true },
  { id: 's5', labelJa: '⑤ VIX≥24+52週+MACD', needsDist52: true, needsMacd: true, needsAdx: false },
  { id: 's6', labelJa: '⑥ VIX≥24+52週+ADX', needsDist52: true, needsMacd: false, needsAdx: true },
  { id: 's7', labelJa: '⑦ VIX≥24+MACD+ADX', needsDist52: false, needsMacd: true, needsAdx: true },
  { id: 's8', labelJa: '⑧ VIX≥24+52週+MACD+ADX', needsDist52: true, needsMacd: true, needsAdx: true },
];

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

function matchesStack(t: EnrichedTrade, def: StackDef): boolean {
  if (t.vix == null || t.vix < VIX_BASE) return false;
  if (def.needsDist52 && t.dist52wPct > DIST52_THRESHOLD) return false;
  if (def.needsMacd && t.macdHistPct < MACD_THRESHOLD) return false;
  if (def.needsAdx && t.adx14 < ADX_THRESHOLD) return false;
  return true;
}

function buildRow(def: StackDef, trades: EnrichedTrade[]): ForwardVix24StackRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  const maes = trades.map((t) => t.maePct).filter((v): v is number => v != null);
  const mfes = trades.map((t) => t.mfePct).filter((v): v is number => v != null);
  return {
    stackId: def.id,
    labelJa: def.labelJa,
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

function formatTable(rows: ForwardVix24StackRow[]): string[] {
  const cols = [
    { w: 22, h: '条件' },
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

export function auditVix24Stack(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24StackAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);

  const rows = STACKS.map((def) =>
    buildRow(
      def,
      enriched.filter((t) => matchesStack(t, def)),
    ),
  );

  const humanLines = [
    `【VIX≥24 スタック比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `基準 VIX≥${VIX_BASE} · 52週≤${DIST52_THRESHOLD}% · MACD≥${MACD_THRESHOLD} · ADX≥${ADX_THRESHOLD}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行出口+3%/25日`,
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
    vixBase: VIX_BASE,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24StackCsv(report: ForwardVix24StackAuditReport): string {
  const header =
    'stack,label,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgHoldDays,avgMaePct,avgMfePct';
  const body = report.rows.map((r) =>
    [
      r.stackId,
      r.labelJa,
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
