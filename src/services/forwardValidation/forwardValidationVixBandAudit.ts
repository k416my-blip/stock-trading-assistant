/**
 * VIX 4区分監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixBandAuditReport,
  ForwardVixBandId,
  ForwardVixBandRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const BAND_DEFS: { id: ForwardVixBandId; labelJa: string; min: number; max: number | null }[] = [
  { id: 'b24_26', labelJa: '① 24≤VIX<26', min: 24, max: 26 },
  { id: 'b26_28', labelJa: '② 26≤VIX<28', min: 26, max: 28 },
  { id: 'b28_30', labelJa: '③ 28≤VIX<30', min: 28, max: 30 },
  { id: 'b30_plus', labelJa: '④ VIX≥30', min: 30, max: null },
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
  bandId: ForwardVixBandId | null;
  maePct: number | null;
  mfePct: number | null;
};

function classifyBand(vix: number): ForwardVixBandId | null {
  for (const b of BAND_DEFS) {
    if (vix >= b.min && (b.max == null || vix < b.max)) return b.id;
  }
  return null;
}

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    const excursion = computeMaeMfe(
      bundle.etfBars[t.symbol],
      t.entryDate,
      t.exitDate,
      t.entryPrice,
    );
    return {
      ...t,
      vix,
      bandId: vix != null ? classifyBand(vix) : null,
      maePct: excursion?.maePct ?? null,
      mfePct: excursion?.mfePct ?? null,
    };
  });
}

function buildRow(def: (typeof BAND_DEFS)[number], trades: EnrichedTrade[]): ForwardVixBandRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  const maes = trades.map((t) => t.maePct).filter((v): v is number => v != null);
  const mfes = trades.map((t) => t.mfePct).filter((v): v is number => v != null);
  return {
    bandId: def.id,
    labelJa: def.labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    avgMaePct: mean(maes),
    avgMfePct: mean(mfes),
    avgVix: mean(trades.map((t) => t.vix!).filter((v) => v != null)),
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardVixBandRow[]): string[] {
  const cols = [
    { w: 14, h: '区分' },
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

export function auditVixBands(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVixBandAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);
  const below24Count = enriched.filter((t) => t.vix != null && t.vix < 24).length;
  const unclassifiedCount = enriched.filter((t) => t.vix == null || t.bandId == null).length;

  const bands = BAND_DEFS.map((def) =>
    buildRow(
      def,
      enriched.filter((t) => t.bandId === def.id),
    ),
  );
  const bandSum = bands.reduce((s, b) => s + b.tradeCount, 0);

  const humanLines = [
    `【VIX 4区分監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 区分計 ${bandSum}件 · 現行出口+3%/25日`,
    below24Count > 0 ? `※ VIX<24 ${below24Count}件（4区分外）` : '',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 一覧比較（シグナル日VIX終値）',
    ...formatTable(bands),
    unclassifiedCount > bandSum + below24Count ? `※ その他未分類 ${unclassifiedCount - below24Count}件` : '',
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    bandedCount: bandSum,
    below24Count,
    bands,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVixBandCsv(report: ForwardVixBandAuditReport): string {
  const header =
    'band,tradeCount,winRatePct,avgReturnPct,sharpe,avgHoldDays,maxHoldRatePct,avgMaePct,avgMfePct,avgVix';
  const body = report.bands.map((b) =>
    [
      b.labelJa,
      b.tradeCount,
      b.winRatePct,
      b.avgReturnPct ?? '',
      b.sharpe ?? '',
      b.avgHoldDays ?? '',
      b.maxHoldRatePct,
      b.avgMaePct ?? '',
      b.avgMfePct ?? '',
      b.avgVix ?? '',
    ].join(','),
  );
  return [header, ...body].join('\n');
}
