/**
 * 96件中6敗 原因分析監査 — ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSixLossComparison,
  ForwardSixLossDetailRow,
  ForwardSixLossRootCauseAuditReport,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_THRESHOLD = 24;
const SPY63_LOOKBACK = 63;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round3(a - b);
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0]!;
  let max = 0;
  for (const [k, c] of counts) {
    if (c > max) {
      max = c;
      best = k;
    }
  }
  return best;
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

export function spy63AtDate(spyBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(spyBars, date);
  if (idx < SPY63_LOOKBACK) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - SPY63_LOOKBACK]! - 1) * 100));
}

function enrichLossRow(
  bundle: ForwardOhlcvBundle,
  t: ForwardPassedTradeRecord,
): ForwardSixLossDetailRow {
  const vix = vixAtDate(bundle.vixBars ?? [], t.signalDate);
  const spy63 = spy63AtDate(bundle.spyBars, t.signalDate);
  return {
    entryDate: t.entryDate,
    ticker: t.symbol,
    returnPct: t.returnPct,
    holdingDays: t.holdDays,
    signalDate: t.signalDate,
    vix,
    adx14: t.adx14,
    macdHistPct: t.macdHistPct,
    spy63Pct: spy63,
    dist52wPct: t.dist52wPct,
    bucket: t.bucket,
    spyRegime: t.spyRegime,
    exitReason: t.exitReason,
    vixGte24: vix != null && vix >= VIX_THRESHOLD,
  };
}

export function extractCommonLossTraits(rows: ForwardSixLossDetailRow[]): string[] {
  if (rows.length === 0) return ['負けトレードなし'];

  const traits: string[] = [];
  const maxHold = rows.filter((r) => r.exitReason === 'max_hold').length;
  const fullHold = rows.filter((r) => r.holdingDays >= 25).length;
  const shallow52 = rows.filter((r) => r.dist52wPct > -5).length;
  const lowVix = rows.filter((r) => r.vix != null && r.vix < VIX_THRESHOLD).length;
  const lowMacd = rows.filter((r) => r.macdHistPct < 0.25).length;
  const upSpy = rows.filter((r) => r.spy63Pct != null && r.spy63Pct > 0).length;

  const etfCounts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const r of rows) etfCounts[r.ticker] = (etfCounts[r.ticker] ?? 0) + 1;

  if (maxHold === rows.length) {
    traits.push(`全${rows.length}件が+3%利確未到達（max_hold）`);
  }
  if (fullHold === rows.length) {
    traits.push(`全${rows.length}件が25日満了決済`);
  }
  if (lowVix === rows.length) {
    traits.push(`全${rows.length}件がVIX<${VIX_THRESHOLD}（低ボラ環境）`);
  } else if (lowVix > 0) {
    traits.push(`${lowVix}/${rows.length}件がVIX<${VIX_THRESHOLD}`);
  }
  if (shallow52 > 0) {
    traits.push(`${shallow52}/${rows.length}件が52w乖離浅い（>-5%）`);
  }
  if (lowMacd > 0) {
    traits.push(`${lowMacd}/${rows.length}件がMACD<0.25%`);
  }
  if (upSpy > 0) {
    traits.push(`${upSpy}/${rows.length}件がSPY63日プラス（上昇/横ばい局面）`);
  }
  traits.push(
    `ETF偏重: ${FORWARD_ETF_UNIVERSE.map((s) => `${s}=${etfCounts[s] ?? 0}`).join(' ')}`,
  );
  traits.push(
    `最多バケット: ${mode(rows.map((r) => r.bucket)) ?? '—'} · SPYレジーム: ${mode(rows.map((r) => r.spyRegime)) ?? '—'}`,
  );
  return traits;
}

function formatLossRow(r: ForwardSixLossDetailRow): string {
  return (
    `${r.entryDate} ${r.ticker} R${r.returnPct}% ${r.holdingDays}日 · ` +
    `VIX${r.vix ?? '—'} ADX${r.adx14} MACD${r.macdHistPct}% SPY63${r.spy63Pct ?? '—'}% 52w${r.dist52wPct}%`
  );
}

export function auditSixLossRootCause(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardSixLossRootCauseAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const wins = passed.trades.filter((t) => t.returnPct > 0);
  const losses = passed.trades.filter((t) => t.returnPct <= 0);
  const lossRows = losses
    .map((t) => enrichLossRow(input.bundle, t))
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.ticker.localeCompare(b.ticker));

  const winVixValues = wins
    .map((t) => vixAtDate(vixBars, t.signalDate))
    .filter((v): v is number => v != null);
  const avgVixWin = mean(winVixValues);
  const avgVixLoss = mean(lossRows.map((r) => r.vix).filter((v): v is number => v != null));

  const comparison: ForwardSixLossComparison = {
    avgVixWin,
    avgVixLoss,
    avgAdxWin: mean(wins.map((t) => t.adx14)),
    avgAdxLoss: mean(lossRows.map((r) => r.adx14)),
    avgMacdWin: mean(wins.map((t) => t.macdHistPct)),
    avgMacdLoss: mean(lossRows.map((r) => r.macdHistPct)),
    vixDelta: delta(avgVixWin, avgVixLoss),
    adxDelta: delta(mean(wins.map((t) => t.adx14)), mean(lossRows.map((r) => r.adx14))),
    macdDelta: delta(mean(wins.map((t) => t.macdHistPct)), mean(lossRows.map((r) => r.macdHistPct))),
  };

  const commonTraits = extractCommonLossTraits(lossRows);
  const commonTraitsJa = commonTraits.join('\n');

  const vix24AvoidedLossCount = lossRows.filter((r) => !r.vixGte24).length;
  const vix24NotAvoidedLossCount = lossRows.filter((r) => r.vixGte24).length;
  const lossAvoidanceRatePct =
    lossRows.length > 0 ? round3((vix24AvoidedLossCount / lossRows.length) * 100) : null;

  const lossAvoidanceVerdictJa =
    lossAvoidanceRatePct === 100
      ? `VIX≥${VIX_THRESHOLD}なら6敗すべて回避（回避率100%）`
      : lossAvoidanceRatePct != null
        ? `VIX≥${VIX_THRESHOLD}で${vix24AvoidedLossCount}/${lossRows.length}件回避（回避率${lossAvoidanceRatePct}%）`
        : '敗北なし';

  const humanLines = [
    `【6敗 原因分析監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 勝${wins.length} 敗${losses.length}（監査のみ）`,
    '',
    '■ 1. 負け6件一覧',
    ...lossRows.map(formatLossRow),
    '',
    '■ 2. 敗北時指標（シグナル日）',
    ...lossRows.map(
      (r) =>
        `${r.ticker} ${r.signalDate}: VIX=${r.vix ?? '—'} ADX=${r.adx14} MACD=${r.macdHistPct}% SPY63=${r.spy63Pct ?? '—'}% 52w=${r.dist52wPct}%`,
    ),
    '',
    '■ 3. 勝ち90件 vs 負け6件 平均比較',
    `VIX: 勝${comparison.avgVixWin ?? '—'} vs 負${comparison.avgVixLoss ?? '—'}（差${comparison.vixDelta ?? '—'}）`,
    `ADX: 勝${comparison.avgAdxWin ?? '—'} vs 負${comparison.avgAdxLoss ?? '—'}（差${comparison.adxDelta ?? '—'}）`,
    `MACD: 勝${comparison.avgMacdWin ?? '—'}% vs 負${comparison.avgMacdLoss ?? '—'}%（差${comparison.macdDelta ?? '—'}%）`,
    '',
    '■ 4. 6敗の共通特徴',
    commonTraitsJa,
    '',
    '■ 5. VIX≥24だったら回避できたか',
    `回避 ${vix24AvoidedLossCount}件 / 未回避 ${vix24NotAvoidedLossCount}件（全${lossRows.length}敗）`,
    '',
    '■ 6. 敗北回避率',
    `${lossAvoidanceVerdictJa}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    winCount: wins.length,
    lossCount: losses.length,
    lossRows,
    comparison,
    commonTraits,
    commonTraitsJa,
    vix24Threshold: VIX_THRESHOLD,
    vix24AvoidedLossCount,
    vix24NotAvoidedLossCount,
    lossAvoidanceRatePct,
    lossAvoidanceVerdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatSixLossRootCauseCsv(
  report: ForwardSixLossRootCauseAuditReport,
): string {
  const header =
    'entry_date,ticker,return_pct,holding_days,signal_date,vix,adx14,macdHistPct,spy63Pct,dist52wPct,bucket,spyRegime,exitReason,vixGte24';
  const rows = report.lossRows.map((r) =>
    [
      r.entryDate,
      r.ticker,
      r.returnPct,
      r.holdingDays,
      r.signalDate,
      r.vix ?? '',
      r.adx14,
      r.macdHistPct,
      r.spy63Pct ?? '',
      r.dist52wPct,
      r.bucket,
      r.spyRegime,
      r.exitReason,
      r.vixGte24 ? 1 : 0,
    ].join(','),
  );
  const summary = [
    '',
    'metric,winners,losers,delta',
    `avgVix,${report.comparison.avgVixWin ?? ''},${report.comparison.avgVixLoss ?? ''},${report.comparison.vixDelta ?? ''}`,
    `avgAdx,${report.comparison.avgAdxWin ?? ''},${report.comparison.avgAdxLoss ?? ''},${report.comparison.adxDelta ?? ''}`,
    `avgMacd,${report.comparison.avgMacdWin ?? ''},${report.comparison.avgMacdLoss ?? ''},${report.comparison.macdDelta ?? ''}`,
    '',
    'vix24AvoidedLossCount,vix24NotAvoidedLossCount,lossAvoidanceRatePct',
    `${report.vix24AvoidedLossCount},${report.vix24NotAvoidedLossCount},${report.lossAvoidanceRatePct ?? ''}`,
  ];
  return [header, ...rows, ...summary].join('\n');
}
