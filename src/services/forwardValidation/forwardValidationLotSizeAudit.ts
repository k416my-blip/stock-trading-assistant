/**
 * 最重要監査その35 — ポジションサイズ（ロット）監査 · 監査34最終ルール · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardLotSizeAdoptionGrade,
  ForwardLotSizeAuditReport,
  ForwardLotSizeCapitalRecommendation,
  ForwardLotSizeSchemeKind,
  ForwardLotSizeSchemeMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  collectFullHistoryExecutedTrades,
  mulberry32,
  shuffleInPlace,
  winRateSlotPct,
} from './forwardValidationMonteCarloAudit';
import { kellyFractionFromHistory } from './forwardValidationPositionSizingAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const REFERENCE_CAPITAL_MYR = 3000;
const RUIN_EQUITY_PCT = 50;
const RUIN_SHUFFLE_RUNS = 50;
const MIN_SLOT_PCT = 12;
const MAX_SLOT_PCT = 50;
const SINCE_2026_FROM = '2026-01-01';

export const FIXED_LOT_MYR = [300, 500, 700, 1000, 1500] as const;
export const FIXED_DEPLOY_PCT = [10, 15, 20, 25, 30] as const;
export const KELLY_FRACTIONS = [0.25, 0.5, 0.75, 1.0] as const;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

export type LotSizingSpec =
  | { kind: 'fixed_myr'; schemeId: string; labelJa: string; lotMYR: number }
  | { kind: 'fixed_pct'; schemeId: string; labelJa: string; deployPct: number }
  | {
      kind: 'kelly';
      schemeId: string;
      labelJa: string;
      kellyFraction: number;
    }
  | { kind: 'win_rate'; schemeId: string; labelJa: string };

export type LotPathResult = {
  finalEquity: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  minEquityPct: number;
  avgSlotMYR: number;
  tradeCount: number;
  equityReturns: number[];
  profitFactor: number | null;
};

type ActiveLeg = ForwardPassedTradeRecord & { notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function clampSlotPct(pct: number): number {
  return round3(Math.max(MIN_SLOT_PCT, Math.min(MAX_SLOT_PCT, pct)));
}

export function buildLotSizingSpecs(): LotSizingSpec[] {
  const specs: LotSizingSpec[] = [
    {
      kind: 'win_rate',
      schemeId: 'win_rate_baseline',
      labelJa: '勝率重み（現行）',
    },
  ];
  for (const lot of FIXED_LOT_MYR) {
    specs.push({
      kind: 'fixed_myr',
      schemeId: `fixed_myr_${lot}`,
      labelJa: `固定RM${lot}/枠`,
      lotMYR: lot,
    });
  }
  for (const pct of FIXED_DEPLOY_PCT) {
    specs.push({
      kind: 'fixed_pct',
      schemeId: `fixed_pct_${pct}`,
      labelJa: `資産の${pct}%/枠`,
      deployPct: pct,
    });
  }
  for (const k of KELLY_FRACTIONS) {
    specs.push({
      kind: 'kelly',
      schemeId: `kelly_${String(k).replace('.', '')}`,
      labelJa: `${k} Kelly`,
      kellyFraction: k,
    });
  }
  return specs;
}

export function resolveEntryNotional(input: {
  spec: LotSizingSpec;
  equity: number;
  openNotional: number;
  trade: ForwardPassedTradeRecord;
  allTrades: ForwardPassedTradeRecord[];
  symbols: string[];
  maxDeployFrac: number;
}): number {
  const available = Math.max(0, input.equity * input.maxDeployFrac - input.openNotional);
  if (available <= 0) return 0;

  if (input.spec.kind === 'fixed_myr') {
    return round3(Math.min(input.spec.lotMYR, available));
  }
  if (input.spec.kind === 'fixed_pct') {
    return round3(Math.min((input.equity * input.spec.deployPct) / 100, available));
  }
  if (input.spec.kind === 'kelly') {
    const kf = kellyFractionFromHistory(input.allTrades, input.trade.signalDate);
    const pct = clampSlotPct(kf * 100 * input.spec.kellyFraction);
    return round3(Math.min((input.equity * pct) / 100, available));
  }
  const pct = winRateSlotPct(input.trade, input.allTrades, input.symbols);
  return round3(Math.min((input.equity * pct) / 100, available));
}

export function simulateLotSizingPath(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  spec: LotSizingSpec;
  initialCapitalMYR: number;
  cashReservePct?: number;
  resolveSpec?: (trade: ForwardPassedTradeRecord) => LotSizingSpec;
}): LotPathResult {
  const cashReservePct = input.cashReservePct ?? CASH_RESERVE_PCT;
  const maxDeployFrac = (100 - cashReservePct) / 100;
  const initial = input.initialCapitalMYR;

  const entries = [...input.trades].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, ActiveLeg[]>();
  for (const t of entries) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...entries.map((t) => t.entryDate), ...entries.map((t) => t.exitDate)]),
  ].sort();

  let equity = initial;
  let peak = initial;
  let maxDd = 0;
  let minEquity = initial;
  const open: ActiveLeg[] = [];
  const equityReturns: number[] = [];
  const slotNotionals: number[] = [];
  let executed = 0;
  let grossWinMYR = 0;
  let grossLossMYR = 0;

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
      if (pnl > 0) grossWinMYR += pnl;
      else grossLossMYR += Math.abs(pnl);
      const eqBefore = equity;
      equity = round3(equity + pnl);
      if (equity < minEquity) minEquity = equity;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;
      equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
      executed++;
    }

    for (const t of entries.filter((e) => e.entryDate === date)) {
      if (open.length >= FORWARD_MAX_CONCURRENT) continue;
      const entrySpec = input.resolveSpec?.(t) ?? input.spec;
      const notional = resolveEntryNotional({
        spec: entrySpec,
        equity,
        openNotional: open.reduce((s, o) => s + o.notional, 0),
        trade: t,
        allTrades: input.trades,
        symbols: input.symbols,
        maxDeployFrac,
      });
      if (notional <= 0) continue;
      slotNotionals.push(notional);
      open.push({ ...t, notional });
    }
  }

  const cumulativeReturnPct = round3(((equity - initial) / initial) * 100);
  const minEquityPct = round3((minEquity / initial) * 100);
  const years = calendarYears(
    entries[0]?.entryDate ?? '2018-01-01',
    entries[entries.length - 1]?.exitDate ?? '2026-01-01',
  );
  const cagr =
    equity > 0 && initial > 0
      ? round3((Math.pow(equity / initial, 1 / years) - 1) * 100)
      : null;
  const maxDdPct = round3(maxDd);
  const mar =
    cagr != null && maxDdPct !== 0 ? round3(cagr / Math.abs(maxDdPct)) : null;
  const mu = mean(equityReturns);
  const sigma = std(equityReturns);
  const sharpe =
    sigma > 1e-9 && equityReturns.length >= 2
      ? round3((mu / sigma) * Math.sqrt(Math.max(executed / years, 1)))
      : null;

  return {
    finalEquity: equity,
    cumulativeReturnPct,
    maxDrawdownPct: maxDdPct,
    sharpe,
    mar,
    minEquityPct,
    avgSlotMYR: slotNotionals.length > 0 ? round3(mean(slotNotionals)) : 0,
    tradeCount: executed,
    equityReturns,
    profitFactor:
      grossLossMYR > 0 ? round3(grossWinMYR / grossLossMYR) : grossWinMYR > 0 ? null : null,
  };
}

export function estimateBankruptcyRatePct(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  spec: LotSizingSpec;
  initialCapitalMYR: number;
  runs?: number;
  resolveSpec?: (trade: ForwardPassedTradeRecord) => LotSizingSpec;
}): number {
  const runs = input.runs ?? RUIN_SHUFFLE_RUNS;
  const rand = mulberry32(35_001);
  let ruinCount = 0;

  for (let i = 0; i < runs; i++) {
    const shuffled = shuffleInPlace([...input.trades], rand);
    const path = simulateLotSizingPath({
      trades: shuffled,
      symbols: input.symbols,
      spec: input.spec,
      initialCapitalMYR: input.initialCapitalMYR,
      resolveSpec: input.resolveSpec,
    });
    if (path.minEquityPct < RUIN_EQUITY_PCT || path.finalEquity < input.initialCapitalMYR * 0.55) {
      ruinCount++;
    }
  }

  return round3((ruinCount / runs) * 100);
}

export function pathToMetrics(
  spec: LotSizingSpec,
  path: LotPathResult,
  bankruptcyRatePct: number,
): ForwardLotSizeSchemeMetrics {
  return {
    schemeId: spec.schemeId,
    kind: spec.kind,
    labelJa: spec.labelJa,
    lotMYR: spec.kind === 'fixed_myr' ? spec.lotMYR : null,
    deployPct: spec.kind === 'fixed_pct' ? spec.deployPct : null,
    kellyFraction: spec.kind === 'kelly' ? spec.kellyFraction : null,
    tradeCount: path.tradeCount,
    cumulativeReturnPct: path.cumulativeReturnPct,
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    mar: path.mar,
    bankruptcyRatePct,
    avgSlotMYR: path.avgSlotMYR,
  };
}

export function pickBestLotForCapital(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  capitalMYR: number;
}): ForwardLotSizeCapitalRecommendation {
  const deployable = input.capitalMYR * ((100 - CASH_RESERVE_PCT) / 100);
  const maxPerSlot = deployable / FORWARD_MAX_CONCURRENT;

  let best: { lot: number; score: number; path: LotPathResult } | null = null;

  for (const lot of FIXED_LOT_MYR) {
    if (lot > maxPerSlot * 1.05) continue;
    const spec: LotSizingSpec = {
      kind: 'fixed_myr',
      schemeId: `fixed_myr_${lot}`,
      labelJa: `固定RM${lot}/枠`,
      lotMYR: lot,
    };
    const path = simulateLotSizingPath({
      trades: input.trades,
      symbols: input.symbols,
      spec,
      initialCapitalMYR: input.capitalMYR,
    });
    const score =
      path.mar ?? path.cumulativeReturnPct * 0.3 - Math.abs(path.maxDrawdownPct) * 0.5;
    if (!best || score > best.score) {
      best = { lot, score, path };
    }
  }

  const wrPath = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec: { kind: 'win_rate', schemeId: 'win_rate', labelJa: '勝率重み' },
    initialCapitalMYR: input.capitalMYR,
  });
  const wrLot = Math.round(wrPath.avgSlotMYR);
  if (
    !best ||
    ((wrPath.mar ?? 0) > (best.path.mar ?? -999) &&
      Math.abs(wrPath.maxDrawdownPct) <= Math.abs(best.path.maxDrawdownPct) + 3)
  ) {
    return {
      capitalMYR: input.capitalMYR,
      optimalLotMYR: wrLot,
      schemeId: 'win_rate_baseline',
      labelJa: '勝率重み（現行）',
      noteJa: `MAR${wrPath.mar ?? '—'} · 累積${wrPath.cumulativeReturnPct}% · DD${wrPath.maxDrawdownPct}% · 平均枠RM${wrLot}`,
    };
  }

  return {
    capitalMYR: input.capitalMYR,
    optimalLotMYR: best.lot,
    schemeId: `fixed_myr_${best.lot}`,
    labelJa: `固定RM${best.lot}/枠`,
    noteJa: `MAR${best.path.mar ?? '—'} · 累積${best.path.cumulativeReturnPct}% · DD${best.path.maxDrawdownPct}%`,
  };
}

export function gradeOperationalLot(input: {
  scheme: ForwardLotSizeSchemeMetrics;
  bankruptcyRatePct: number;
}): ForwardLotSizeAdoptionGrade {
  if (input.bankruptcyRatePct > 15) return 'D';
  if (input.bankruptcyRatePct > 5) return 'C';
  if (Math.abs(input.maxDrawdownPct) > 25) return 'C';
  if (input.scheme.kind === 'win_rate' && input.bankruptcyRatePct <= 5) return 'A';
  if (input.bankruptcyRatePct <= 8 && (input.mar ?? 0) > 1) return 'B';
  return 'B';
}

export function auditLotSize(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardLotSizeAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const specs = buildLotSizingSpecs();

  const schemeRows: ForwardLotSizeSchemeMetrics[] = specs.map((spec) => {
    const path = simulateLotSizingPath({
      trades,
      symbols,
      spec,
      initialCapitalMYR: REFERENCE_CAPITAL_MYR,
    });
    const bankruptcyRatePct = estimateBankruptcyRatePct({
      trades,
      symbols,
      spec,
      initialCapitalMYR: REFERENCE_CAPITAL_MYR,
    });
    return pathToMetrics(spec, path, bankruptcyRatePct);
  });

  const byCum = [...schemeRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const byDd = [...schemeRows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct) - Math.abs(b.maxDrawdownPct),
  );
  const bySharpe = [...schemeRows].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  const byBankrupt = [...schemeRows].sort(
    (a, b) => a.bankruptcyRatePct - b.bankruptcyRatePct,
  );

  const bestProfit = byCum[0]!;
  const bestDd = byDd[0]!;
  const bestSharpe = bySharpe[0]!;
  const bestBankrupt = byBankrupt[0]!;

  const trades2026 = trades.filter((t) => t.signalDate >= SINCE_2026_FROM);
  const since2026Spec = FIXED_LOT_MYR.map((lot) => {
    const spec: LotSizingSpec = {
      kind: 'fixed_myr',
      schemeId: `fixed_myr_${lot}`,
      labelJa: `固定RM${lot}/枠`,
      lotMYR: lot,
    };
    const path = simulateLotSizingPath({
      trades: trades2026.length > 0 ? trades2026 : trades,
      symbols,
      spec,
      initialCapitalMYR: REFERENCE_CAPITAL_MYR,
    });
    return { lot, path };
  }).sort((a, b) => (b.path.cumulativeReturnPct ?? 0) - (a.path.cumulativeReturnPct ?? 0))[0]!;

  const capitalRecommendations = [3000, 10_000, 30_000].map((cap) =>
    pickBestLotForCapital({ trades, symbols, capitalMYR: cap }),
  );

  const baseline = schemeRows.find((r) => r.kind === 'win_rate')!;
  const operationalGrade = gradeOperationalLot({
    scheme: baseline,
    bankruptcyRatePct: baseline.bankruptcyRatePct,
  });
  const operationalLotMYR = Math.round(
    capitalRecommendations.find((c) => c.capitalMYR === 3000)?.optimalLotMYR ??
      baseline.avgSlotMYR ??
      700,
  );

  const answerAJa = `利益最大: ${bestProfit.labelJa}（累積${bestProfit.cumulativeReturnPct}% · 平均枠RM${bestProfit.avgSlotMYR ?? '—'} · 評価${bestProfit.cumulativeReturnPct > baseline.cumulativeReturnPct ? 'C' : 'B'}）`;
  const answerBJa = `DD最小: ${bestDd.labelJa}（DD${bestDd.maxDrawdownPct}% · 累積${bestDd.cumulativeReturnPct}% · 評価B）`;
  const answerCJa = `Sharpe最大: ${bestSharpe.labelJa}（Sharpe${bestSharpe.sharpe ?? '—'} · MAR${bestSharpe.mar ?? '—'} · 評価B）`;
  const answerDJa = `破産率最小: ${bestBankrupt.labelJa}（${bestBankrupt.bankruptcyRatePct}% · ${RUIN_SHUFFLE_RUNS}順序ストレス · 評価${bestBankrupt.bankruptcyRatePct <= 5 ? 'A' : 'B'}）`;
  const answerEJa =
    trades2026.length > 0
      ? `2026年以降推奨ロット: RM${since2026Spec.lot}/枠（${trades2026.length}件 · 累積${since2026Spec.path.cumulativeReturnPct}% · 評価B）`
      : `2026年以降: 取引未発生 · 暫定RM${operationalLotMYR}/枠（全期間勝率重みと同じ）`;

  const operationalNoteJa =
    `${operationalGrade}: RM3000運用 · 1枠${operationalLotMYR}MYR · 勝率重み基準（平均枠RM${Math.round(baseline.avgSlotMYR ?? operationalLotMYR)}）· ` +
    `破産率${baseline.bankruptcyRatePct}% · DD${baseline.maxDrawdownPct}%`;

  const humanSummaryJa = [
    '【最重要監査その35 · ポジションサイズ監査】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate} · ${trades.length}件 · 基準資本RM${REFERENCE_CAPITAL_MYR}`,
    '',
    '■ 固定ロット RM300〜1500',
    ...schemeRows
      .filter((r) => r.kind === 'fixed_myr')
      .map(
        (r) =>
          `${r.labelJa}: 累積${r.cumulativeReturnPct}% DD${r.maxDrawdownPct}% Sharpe${r.sharpe ?? '—'} MAR${r.mar ?? '—'} 破産率${r.bankruptcyRatePct}%`,
      ),
    '',
    '■ 固定比率 10〜30%',
    ...schemeRows
      .filter((r) => r.kind === 'fixed_pct')
      .map(
        (r) =>
          `${r.labelJa}: 累積${r.cumulativeReturnPct}% DD${r.maxDrawdownPct}% 破産率${r.bankruptcyRatePct}%`,
      ),
    '',
    '■ Kelly',
    ...schemeRows
      .filter((r) => r.kind === 'kelly')
      .map(
        (r) =>
          `${r.labelJa}: 累積${r.cumulativeReturnPct}% DD${r.maxDrawdownPct}% 破産率${r.bankruptcyRatePct}%`,
      ),
    '',
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    '',
    ...capitalRecommendations.map((c) => `RM${c.capitalMYR}: ${c.noteJa}`),
    '',
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    referenceCapitalMYR: REFERENCE_CAPITAL_MYR,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    tradeCount: trades.length,
    schemeRows,
    capitalRecommendations,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalLotMYR,
    operationalGrade,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runLotSizeAudit(): Promise<ForwardLotSizeAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditLotSize({ bundle });
}

export function formatLotSizeCsv(report: ForwardLotSizeAuditReport): string {
  const lines = [
    `# 最重要監査その35 ロットサイズ ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 基準資本RM${report.referenceCapitalMYR}`,
    '',
    'schemeId,kind,label,lotMYR,deployPct,kellyFrac,tradeCount,cumulative,maxDD,sharpe,mar,bankruptcyPct,avgSlotMYR',
    ...report.schemeRows.map((r) =>
      [
        r.schemeId,
        r.kind,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.lotMYR ?? '',
        r.deployPct ?? '',
        r.kellyFraction ?? '',
        r.tradeCount,
        r.cumulativeReturnPct,
        r.maxDrawdownPct,
        r.sharpe ?? '',
        r.mar ?? '',
        r.bankruptcyRatePct,
        r.avgSlotMYR ?? '',
      ].join(','),
    ),
    '',
    'capitalMYR,optimalLotMYR,schemeId,note',
    ...report.capitalRecommendations.map((c) =>
      [
        c.capitalMYR,
        c.optimalLotMYR,
        c.schemeId,
        `"${c.noteJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'answer,content',
  ];
  const answers: [string, string][] = [
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['operational', report.operationalNoteJa],
  ];
  for (const [k, v] of answers) {
    lines.push(`${k},"${v.replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}
