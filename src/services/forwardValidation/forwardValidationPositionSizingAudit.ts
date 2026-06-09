/**
 * 最重要監査その27 — ポジションサイズ最適化 · ADX20推奨ルール · 2018〜 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardPositionSizingAuditReport,
  ForwardPositionSizingCapitalRow,
  ForwardPositionSizingMetrics,
  ForwardPositionSizingModelRow,
  ForwardPositionSizingSchemeId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { collectRecommendedRuleOperationalTrades } from './forwardValidationFinalRulesAblationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const BASELINE_SLOT_PCT = 100 / FORWARD_MAX_CONCURRENT;
const MIN_SLOT_PCT = 12;
const MAX_SLOT_PCT = 50;
const ETF_ORDER: ForwardEtfSymbol[] = ['DGRO', 'SCHD', 'VYM', 'SPLG'];

const FIXED_RULES_JA =
  'ADX>20 · VIX≥24 · 52週高値 · SPY63 · MACD · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

type SchemeDef = {
  id: ForwardPositionSizingSchemeId;
  labelJa: string;
  kellyFraction: number | null;
};

export const POSITION_SIZING_SCHEMES: SchemeDef[] = [
  { id: 'equal', labelJa: '① 均等配分（各33.3%）', kellyFraction: null },
  { id: 'win_rate', labelJa: '② 勝率重み（ETF過去成績）', kellyFraction: null },
  { id: 'quality_score', labelJa: '③ 品質スコア重み', kellyFraction: null },
  { id: 'kelly_25', labelJa: '④ Kelly 25%', kellyFraction: 0.25 },
  { id: 'kelly_50', labelJa: '⑤ Kelly 50%', kellyFraction: 0.5 },
  { id: 'kelly_100', labelJa: '⑥ Kelly 100%', kellyFraction: 1.0 },
];

type SizedTrade = ForwardPassedTradeRecord & {
  slotPct: number;
  notional: number;
  equityBefore: number;
  pnl: number;
  equityReturnPct: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return vixBars[idx]!.close;
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

export function symbolWinRatesBefore(
  trades: ForwardPassedTradeRecord[],
  beforeDate: string,
): Record<ForwardEtfSymbol, number> {
  const prior = trades.filter((t) => t.signalDate < beforeDate);
  const out = {} as Record<ForwardEtfSymbol, number>;
  for (const sym of ETF_ORDER) {
    const rows = prior.filter((t) => t.symbol === sym);
    if (rows.length === 0) {
      out[sym] = 0.5;
      continue;
    }
    out[sym] = rows.filter((t) => t.returnPct > 0).length / rows.length;
  }
  return out;
}

export function qualityScore(
  trade: ForwardPassedTradeRecord,
  vix: number | null,
): number {
  let score = 1;
  const adx = trade.adx14;
  const v = vix ?? 24;
  if (v >= 40) score += 0.8;
  else if (v >= 30) score += 0.5;
  else if (v >= 24) score += 0.2;
  if (adx >= 30) score += 0.5;
  else if (adx >= 20) score += 0.2;
  if (trade.dist52wPct >= -5) score += 0.3;
  else if (trade.dist52wPct >= -10) score += 0.15;
  if (trade.spyRegime === 'down') score += 0.15;
  else if (trade.spyRegime === 'sideways') score += 0.08;
  return score;
}

export function kellyFractionFromHistory(
  trades: ForwardPassedTradeRecord[],
  beforeDate: string,
): number {
  const prior = trades.filter((t) => t.signalDate < beforeDate);
  const sample = prior.length >= 5 ? prior : trades.filter((t) => t.signalDate <= beforeDate);
  if (sample.length < 3) return 0.1;
  const wins = sample.filter((t) => t.returnPct > 0);
  const losses = sample.filter((t) => t.returnPct <= 0);
  const p = wins.length / sample.length;
  const q = 1 - p;
  const avgWin = wins.length > 0 ? mean(wins.map((t) => t.returnPct)) : 3;
  const avgLoss = losses.length > 0 ? Math.abs(mean(losses.map((t) => t.returnPct))) : 3;
  const b = avgLoss > 0 ? avgWin / avgLoss : 1;
  const f = b > 0 ? (p * b - q) / b : 0;
  return Math.max(0, Math.min(1, f));
}

export function resolveSlotPct(input: {
  schemeId: ForwardPositionSizingSchemeId;
  trade: ForwardPassedTradeRecord;
  allTrades: ForwardPassedTradeRecord[];
  vixBars: OhlcvBar[];
  kellyMultiplier: number | null;
}): number {
  const { schemeId, trade, allTrades, vixBars, kellyMultiplier } = input;
  const base = BASELINE_SLOT_PCT;

  if (schemeId === 'equal') return base;

  if (schemeId === 'win_rate') {
    const wr = symbolWinRatesBefore(allTrades, trade.signalDate);
    const symWr = wr[trade.symbol as ForwardEtfSymbol] ?? 0.5;
    const avgWr = mean(ETF_ORDER.map((s) => wr[s]));
    const mult = avgWr > 0 ? symWr / avgWr : 1;
    return clampSlot(base * mult);
  }

  if (schemeId === 'quality_score') {
    const vix = vixAtDate(vixBars, trade.signalDate);
    const score = qualityScore(trade, vix);
    const mult = score / 1.5;
    return clampSlot(base * mult);
  }

  if (schemeId.startsWith('kelly_') && kellyMultiplier != null) {
    const rawKelly = kellyFractionFromHistory(allTrades, trade.signalDate);
    return clampSlot(rawKelly * 100 * kellyMultiplier);
  }

  return base;
}

function clampSlot(pct: number): number {
  return round3(Math.max(MIN_SLOT_PCT, Math.min(MAX_SLOT_PCT, pct)));
}

export function simulatePositionSizing(
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  schemeId: ForwardPositionSizingSchemeId,
  kellyMultiplier: number | null,
  initialCapital = 100,
): { sizedTrades: SizedTrade[]; equityCurve: { date: string; equity: number }[] } {
  const vixBars = bundle.vixBars ?? [];
  type Pending = ForwardPassedTradeRecord & { slotPct: number };
  type Active = Pending & { notional: number; equityBeforeEntry: number };

  const entries = [...trades].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, Active[]>();
  for (const t of entries) {
    const slotPct = resolveSlotPct({
      schemeId,
      trade: t,
      allTrades: trades,
      vixBars,
      kellyMultiplier,
    });
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, slotPct, notional: 0, equityBeforeEntry: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([
      ...entries.map((t) => t.entryDate),
      ...entries.map((t) => t.exitDate),
    ]),
  ].sort();

  let equity = initialCapital;
  const open: Active[] = [];
  const sizedTrades: SizedTrade[] = [];
  const equityCurve: { date: string; equity: number }[] = [];

  for (const date of eventDates) {
    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex(
        (o) => o.id === leg.id && o.entryDate === leg.entryDate && o.symbol === leg.symbol,
      );
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = round3((active.notional * active.returnPct) / 100);
      const equityBefore = equity;
      equity = round3(equity + pnl);
      sizedTrades.push({
        ...active,
        notional: active.notional,
        equityBefore,
        pnl,
        equityReturnPct: equityBefore > 0 ? round3((pnl / equityBefore) * 100) : 0,
      });
    }

    for (const t of entries.filter((e) => e.entryDate === date)) {
      if (open.length >= FORWARD_MAX_CONCURRENT) continue;
      const slotPct = resolveSlotPct({
        schemeId,
        trade: t,
        allTrades: trades,
        vixBars,
        kellyMultiplier,
      });
      const openNotional = open.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;
      open.push({ ...t, slotPct, notional, equityBeforeEntry: equity });
    }

    equityCurve.push({ date, equity });
  }

  if (equityCurve.length === 0) {
    equityCurve.push({ date: eventDates[0] ?? '2000-01-01', equity: initialCapital });
  }

  return {
    sizedTrades: sizedTrades.sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    ),
    equityCurve,
  };
}

function sortino(returns: number[]): number | null {
  const down = returns.filter((r) => r < 0);
  if (returns.length < 2 || down.length === 0) return null;
  const ds = std(down);
  return ds > 1e-9 ? round3(mean(returns) / ds) : null;
}

export function buildSizingMetrics(
  scheme: SchemeDef,
  sizedTrades: SizedTrade[],
  equityCurve: { date: string; equity: number }[],
  fromDate: string,
  toDate: string,
  initialCapital: number,
): ForwardPositionSizingMetrics {
  const wins = sizedTrades.filter((t) => t.returnPct > 0);
  const equityReturns = sizedTrades.map((t) => t.equityReturnPct);
  const grossWin = sizedTrades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(
    sizedTrades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0),
  );

  let peak = initialCapital;
  let maxDd = 0;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? (pt.equity - peak) / peak : 0;
    if (dd < maxDd) maxDd = dd;
  }

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
  const years = calendarYears(fromDate, toDate);
  const cagr =
    finalEquity > 0 && initialCapital > 0
      ? round3((Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100)
      : null;
  const maxDdPct = round2(maxDd * 100);
  const mar = cagr != null && maxDdPct != null && maxDdPct !== 0 ? round3(cagr / Math.abs(maxDdPct)) : null;
  const mu = mean(equityReturns);
  const sigma = std(equityReturns);
  const tradesPerYear = sizedTrades.length / years;
  const sharpe =
    sigma > 1e-9 && sizedTrades.length >= 2
      ? round3((mu / sigma) * Math.sqrt(Math.max(tradesPerYear, 1)))
      : null;

  return {
    schemeId: scheme.id,
    labelJa: scheme.labelJa,
    tradeCount: sizedTrades.length,
    winRatePct:
      sizedTrades.length > 0 ? round3((wins.length / sizedTrades.length) * 100) : 0,
    cumulativeReturnPct: round3(((finalEquity - initialCapital) / initialCapital) * 100),
    cagrPct: cagr,
    sharpe,
    sortino: sortino(equityReturns),
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    maxDrawdownPct: maxDdPct,
    mar,
    finalEquityMultiplier: round3(finalEquity / initialCapital),
  };
}

export function buildCapitalRows(
  models: ForwardPositionSizingModelRow[],
): ForwardPositionSizingCapitalRow[] {
  const caps = [3000, 10_000, 50_000];
  const byId = Object.fromEntries(models.map((m) => [m.modelId, m]));
  return caps.map((capitalMYR) => {
    const c = byId.conservative!;
    const s = byId.standard!;
    const a = byId.aggressive!;
    return {
      capitalMYR,
      conservativePerSlotMYR: Math.round((capitalMYR * c.slotPct) / 100),
      standardPerSlotMYR: Math.round((capitalMYR * s.slotPct) / 100),
      aggressivePerSlotMYR: Math.round((capitalMYR * a.slotPct) / 100),
      conservativeCashMYR: Math.round((capitalMYR * c.cashReservePct) / 100),
      standardCashMYR: Math.round((capitalMYR * s.cashReservePct) / 100),
      aggressiveCashMYR: Math.round((capitalMYR * a.cashReservePct) / 100),
    };
  });
}

export function buildModelRows(
  bestGrowth: ForwardPositionSizingSchemeId,
  bestDd: ForwardPositionSizingSchemeId,
  practical: ForwardPositionSizingSchemeId,
): ForwardPositionSizingModelRow[] {
  const aggressiveScheme: ForwardPositionSizingSchemeId = bestGrowth.startsWith('kelly')
    ? 'kelly_50'
    : bestGrowth;
  return [
    {
      modelId: 'conservative',
      labelJa: '保守型',
      schemeId: bestDd.startsWith('kelly') ? 'kelly_25' : 'equal',
      slotPct: bestDd === 'kelly_25' ? 25 : BASELINE_SLOT_PCT,
      cashReservePct: 25,
      descriptionJa: `${bestDd.startsWith('kelly') ? 'Kelly25%' : '均等33.3%'} · 現金25% · DD最小化優先`,
    },
    {
      modelId: 'standard',
      labelJa: '標準型',
      schemeId: practical,
      slotPct: BASELINE_SLOT_PCT,
      cashReservePct: 15,
      descriptionJa: `${POSITION_SIZING_SCHEMES.find((s) => s.id === practical)?.labelJa ?? practical} · 現金15% · MAR最適`,
    },
    {
      modelId: 'aggressive',
      labelJa: '攻撃型',
      schemeId: aggressiveScheme,
      slotPct: aggressiveScheme.startsWith('kelly') ? 40 : 38,
      cashReservePct: 10,
      descriptionJa: `${POSITION_SIZING_SCHEMES.find((s) => s.id === aggressiveScheme)?.labelJa ?? aggressiveScheme} · 現金10% · 成長優先`,
    },
  ];
}

export function evaluatePositionSizing(input: {
  rows: ForwardPositionSizingMetrics[];
  modelRows: ForwardPositionSizingModelRow[];
  capitalRows: ForwardPositionSizingCapitalRow[];
}): {
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
} {
  const { rows, modelRows, capitalRows } = input;
  const byCagr = [...rows].sort((a, b) => (b.cagrPct ?? -999) - (a.cagrPct ?? -999));
  const byDd = [...rows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );
  const byMar = [...rows].sort((a, b) => (b.mar ?? -999) - (a.mar ?? -999));

  const bestGrowth = byCagr[0]!;
  const bestDd = byDd[0]!;
  const practical = byMar[0] ?? rows.find((r) => r.schemeId === 'quality_score')!;

  const rm3k = capitalRows.find((c) => c.capitalMYR === 3000)!;
  const stdModel = modelRows.find((m) => m.modelId === 'standard')!;

  return {
    answer1Ja: `${bestGrowth.labelJa}（CAGR ${bestGrowth.cagrPct ?? '—'}% · 累積${bestGrowth.cumulativeReturnPct}% · 倍率${bestGrowth.finalEquityMultiplier}）。`,
    answer2Ja: `${bestDd.labelJa}（DD ${bestDd.maxDrawdownPct ?? '—'}% · 累積${bestDd.cumulativeReturnPct}%）。`,
    answer3Ja: `${practical.labelJa}（MAR ${practical.mar ?? '—'} · Sharpe ${practical.sharpe ?? '—'} · DD ${practical.maxDrawdownPct ?? '—'}%）。`,
    answer4Ja: `RM3000 · ${stdModel.labelJa}（${stdModel.schemeId}）→ 1枠約RM${rm3k.standardPerSlotMYR} · 現金保留RM${rm3k.standardCashMYR}。`,
    answer5Ja: capitalRows
      .map(
        (c) =>
          `RM${c.capitalMYR.toLocaleString('en-US')}: 保守RM${c.conservativePerSlotMYR}/枠 · 標準RM${c.standardPerSlotMYR}/枠 · 攻撃RM${c.aggressivePerSlotMYR}/枠`,
      )
      .join(' / '),
  };
}

function formatRow(m: ForwardPositionSizingMetrics): string {
  return (
    `${m.labelJa}: 累積${m.cumulativeReturnPct}% · CAGR${m.cagrPct ?? '—'}% · Sharpe${m.sharpe ?? '—'} · ` +
    `Sortino${m.sortino ?? '—'} · PF${m.profitFactor ?? '—'} · DD${m.maxDrawdownPct ?? '—'}% · MAR${m.mar ?? '—'} · WR${m.winRatePct}%`
  );
}

export function auditPositionSizing(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardPositionSizingAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const trades = collectRecommendedRuleOperationalTrades(input.bundle, fromDate, toDate);

  const rows = POSITION_SIZING_SCHEMES.map((scheme) => {
    const { sizedTrades, equityCurve } = simulatePositionSizing(
      trades,
      input.bundle,
      scheme.id,
      scheme.kellyFraction,
    );
    return buildSizingMetrics(scheme, sizedTrades, equityCurve, fromDate, toDate, 100);
  });

  const byCagr = [...rows].sort((a, b) => (b.cagrPct ?? -999) - (a.cagrPct ?? -999));
  const byDd = [...rows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );
  const byMar = [...rows].sort((a, b) => (b.mar ?? -999) - (a.mar ?? -999));

  const modelRows = buildModelRows(
    byCagr[0]!.schemeId,
    byDd[0]!.schemeId,
    byMar[0]!.schemeId,
  );
  const capitalRows = buildCapitalRows(modelRows);
  const answers = evaluatePositionSizing({ rows, modelRows, capitalRows });

  const humanLines = [
    `【最重要監査その27】ポジションサイズ最適化 ${fromDate} ～ ${toDate}`,
    `固定ルール: ${FIXED_RULES_JA}`,
    `基準: 均等配分 各${BASELINE_SLOT_PCT.toFixed(1)}% · ${trades.length}件 · 監査のみ`,
    '',
    '■ スキーム別成績',
    ...rows.map(formatRow),
    '',
    '■ 3モデル',
    ...modelRows.map(
      (m) =>
        `${m.labelJa}: ${m.descriptionJa} · スキーム=${m.schemeId} · 枠${m.slotPct}% · 現金${m.cashReservePct}%`,
    ),
    '',
    '■ 資金別推奨サイズ',
    ...capitalRows.map(
      (c) =>
        `RM${c.capitalMYR}: 保守${c.conservativePerSlotMYR}/枠(現金${c.conservativeCashMYR}) · ` +
        `標準${c.standardPerSlotMYR}/枠(現金${c.standardCashMYR}) · ` +
        `攻撃${c.aggressivePerSlotMYR}/枠(現金${c.aggressiveCashMYR})`,
    ),
    '',
    '■ 必須回答',
    `1. 最高成長 → ${answers.answer1Ja}`,
    `2. 最小DD → ${answers.answer2Ja}`,
    `3. 実運用最適 → ${answers.answer3Ja}`,
    `4. RM3000 → ${answers.answer4Ja}`,
    `5. 資金別 → ${answers.answer5Ja}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedRulesJa: FIXED_RULES_JA,
    baselineSlotPct: BASELINE_SLOT_PCT,
    rows,
    capitalRows,
    modelRows,
    ...answers,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runPositionSizingAudit(): Promise<ForwardPositionSizingAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditPositionSizing({ bundle });
}

export function formatPositionSizingCsv(report: ForwardPositionSizingAuditReport): string {
  return [
    'schemeId,tradeCount,winRatePct,cumulativeReturnPct,cagrPct,sharpe,sortino,profitFactor,maxDrawdownPct,mar,finalEquityMultiplier',
    ...report.rows.map((r) =>
      [
        r.schemeId,
        r.tradeCount,
        r.winRatePct,
        r.cumulativeReturnPct,
        r.cagrPct ?? '',
        r.sharpe ?? '',
        r.sortino ?? '',
        r.profitFactor ?? '',
        r.maxDrawdownPct ?? '',
        r.mar ?? '',
        r.finalEquityMultiplier,
      ].join(','),
    ),
    '',
    'modelId,schemeId,slotPct,cashReservePct,label',
    ...report.modelRows.map((m) =>
      [m.modelId, m.schemeId, m.slotPct, m.cashReservePct, `"${m.labelJa}"`].join(','),
    ),
    '',
    'capitalMYR,conservativePerSlot,standardPerSlot,aggressivePerSlot,conservativeCash,standardCash,aggressiveCash',
    ...report.capitalRows.map((c) =>
      [
        c.capitalMYR,
        c.conservativePerSlotMYR,
        c.standardPerSlotMYR,
        c.aggressivePerSlotMYR,
        c.conservativeCashMYR,
        c.standardCashMYR,
        c.aggressiveCashMYR,
      ].join(','),
    ),
  ].join('\n');
}
