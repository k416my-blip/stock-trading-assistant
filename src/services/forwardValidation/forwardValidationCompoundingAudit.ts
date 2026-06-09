/**
 * 最重要監査その36 — 複利運用（Compounding）監査 · 監査35推奨固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardCompoundingAdoptionGrade,
  ForwardCompoundingAuditReport,
  ForwardCompoundingModeId,
  ForwardCompoundingModeMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  collectFullHistoryExecutedTrades,
  mulberry32,
  shuffleInPlace,
} from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const BASE_CAPITAL_MYR = 3000;
const BASE_LOT_PER_SLOT_MYR = 700;
const RUIN_EQUITY_PCT = 50;
const RUIN_SHUFFLE_RUNS = 40;
const SINCE_2026_FROM = '2026-01-01';
const BASELINE_MODE: ForwardCompoundingModeId = 'compound_yes';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const COMPOUNDING_MODES: { modeId: ForwardCompoundingModeId; labelJa: string }[] = [
  { modeId: 'compound_yes', labelJa: '① 複利あり' },
  { modeId: 'compound_no', labelJa: '② 複利なし' },
  { modeId: 'reinvest_100', labelJa: '③ 利益100%再投資' },
  { modeId: 'reinvest_50', labelJa: '④ 利益50%再投資' },
  { modeId: 'reinvest_25', labelJa: '⑤ 利益25%再投資' },
  { modeId: 'reinvest_monthly', labelJa: '⑥ 月次再投資' },
  { modeId: 'reinvest_quarterly', labelJa: '⑦ 四半期再投資' },
  { modeId: 'reinvest_annual', labelJa: '⑧ 年次再投資' },
];

type ActiveLeg = ForwardPassedTradeRecord & { notional: number };

export type CompoundPathResult = {
  finalEquity: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  minEquityPct: number;
  tradeCount: number;
  equityReturns: number[];
};

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

export function lotPerSlotForCapital(capitalMYR: number): number {
  return Math.round(BASE_LOT_PER_SLOT_MYR * (capitalMYR / BASE_CAPITAL_MYR));
}

export function horizonCutoffDate(toDate: string, years: number): string {
  const d = new Date(toDate);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function periodKey(
  date: string,
  mode: 'reinvest_monthly' | 'reinvest_quarterly' | 'reinvest_annual',
): string {
  const [y, m] = date.split('-');
  const mi = parseInt(m ?? '1', 10);
  if (mode === 'reinvest_annual') return y ?? '0000';
  if (mode === 'reinvest_quarterly') {
    const q = Math.ceil(mi / 3);
    return `${y}-Q${q}`;
  }
  return `${y}-${m}`;
}

export function resolveSizingBase(input: {
  modeId: ForwardCompoundingModeId;
  equity: number;
  initial: number;
  sizingBase: number;
}): number {
  const profit = Math.max(0, input.equity - input.initial);
  switch (input.modeId) {
    case 'compound_no':
      return input.initial;
    case 'compound_yes':
    case 'reinvest_100':
      return input.equity;
    case 'reinvest_50':
      return round3(input.initial + profit * 0.5);
    case 'reinvest_25':
      return round3(input.initial + profit * 0.25);
    case 'reinvest_monthly':
    case 'reinvest_quarterly':
    case 'reinvest_annual':
      return input.sizingBase;
    default:
      return input.equity;
  }
}

export function simulateCompoundingPath(input: {
  trades: ForwardPassedTradeRecord[];
  modeId: ForwardCompoundingModeId;
  initialCapitalMYR: number;
  lotPerSlotMYR: number;
}): CompoundPathResult {
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const initial = input.initialCapitalMYR;
  const baseLot = input.lotPerSlotMYR;

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
  let sizingBase = initial;
  let lastPeriodKey = '';
  const open: ActiveLeg[] = [];
  const equityReturns: number[] = [];
  let executed = 0;

  const isPeriodic =
    input.modeId === 'reinvest_monthly' ||
    input.modeId === 'reinvest_quarterly' ||
    input.modeId === 'reinvest_annual';

  for (const date of eventDates) {
    if (isPeriodic) {
      const key = periodKey(
        date,
        input.modeId as 'reinvest_monthly' | 'reinvest_quarterly' | 'reinvest_annual',
      );
      if (lastPeriodKey && key !== lastPeriodKey) {
        sizingBase = round3(equity);
      }
      if (!lastPeriodKey) {
        sizingBase = initial;
      }
      lastPeriodKey = key;
    }

    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex(
        (o) => o.id === leg.id && o.entryDate === leg.entryDate && o.symbol === leg.symbol,
      );
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = round3((active.notional * active.returnPct) / 100);
      const eqBefore = equity;
      equity = round3(equity + pnl);
      if (equity < minEquity) minEquity = equity;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;
      equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
      executed++;
    }

    const sizingEquity = resolveSizingBase({
      modeId: input.modeId,
      equity,
      initial,
      sizingBase,
    });
    const lotScale = initial > 0 ? sizingEquity / initial : 1;
    const effectiveLot = round3(baseLot * lotScale);

    for (const t of entries.filter((e) => e.entryDate === date)) {
      if (open.length >= FORWARD_MAX_CONCURRENT) continue;
      const openNotional = open.reduce((s, o) => s + o.notional, 0);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(effectiveLot, available));
      if (notional <= 0) continue;
      open.push({ ...t, notional });
    }
  }

  const fromDate = entries[0]?.entryDate ?? '2018-01-01';
  const toDate = entries[entries.length - 1]?.exitDate ?? '2026-01-01';
  const years = calendarYears(fromDate, toDate);
  const cumulativeReturnPct = round3(((equity - initial) / initial) * 100);
  const maxDdPct = round3(maxDd);
  const cagr =
    equity > 0 && initial > 0
      ? round3((Math.pow(equity / initial, 1 / Math.max(years, 0.1)) - 1) * 100)
      : null;
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
    minEquityPct: round3((minEquity / initial) * 100),
    tradeCount: executed,
    equityReturns,
  };
}

export function estimateCompoundingBankruptcyRate(input: {
  trades: ForwardPassedTradeRecord[];
  modeId: ForwardCompoundingModeId;
  initialCapitalMYR: number;
  lotPerSlotMYR: number;
  runs?: number;
}): number {
  const runs = input.runs ?? RUIN_SHUFFLE_RUNS;
  const rand = mulberry32(36_001);
  let ruin = 0;
  for (let i = 0; i < runs; i++) {
    const shuffled = shuffleInPlace([...input.trades], rand);
    const path = simulateCompoundingPath({
      trades: shuffled,
      modeId: input.modeId,
      initialCapitalMYR: input.initialCapitalMYR,
      lotPerSlotMYR: input.lotPerSlotMYR,
    });
    if (
      path.minEquityPct < RUIN_EQUITY_PCT ||
      path.finalEquity < input.initialCapitalMYR * 0.55
    ) {
      ruin++;
    }
  }
  return round3((ruin / runs) * 100);
}

function pathToMetrics(
  modeId: ForwardCompoundingModeId,
  labelJa: string,
  path: CompoundPathResult,
  input: {
    initialCapitalMYR: number;
    lotPerSlotMYR: number;
    horizonYears: number | null;
    bankruptcyRatePct: number;
    baselinePath: CompoundPathResult | null;
    baselineBankruptcyPct: number | null;
  },
): ForwardCompoundingModeMetrics {
  return {
    modeId,
    labelJa,
    initialCapitalMYR: input.initialCapitalMYR,
    lotPerSlotMYR: input.lotPerSlotMYR,
    horizonYears: input.horizonYears,
    tradeCount: path.tradeCount,
    finalEquityMYR: round3(path.finalEquity),
    cumulativeReturnPct: path.cumulativeReturnPct,
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    mar: path.mar,
    bankruptcyRatePct: input.bankruptcyRatePct,
    maxDrawdownDeltaPt: input.baselinePath
      ? round3(path.maxDrawdownPct - input.baselinePath.maxDrawdownPct)
      : null,
    sharpeDelta:
      input.baselinePath && path.sharpe != null && input.baselinePath.sharpe != null
        ? round3(path.sharpe - input.baselinePath.sharpe)
        : null,
    marDelta:
      input.baselinePath && path.mar != null && input.baselinePath.mar != null
        ? round3(path.mar - input.baselinePath.mar)
        : null,
    bankruptcyDeltaPt:
      input.baselineBankruptcyPct != null
        ? round3(input.bankruptcyRatePct - input.baselineBankruptcyPct)
        : null,
  };
}

function runModeMetrics(input: {
  trades: ForwardPassedTradeRecord[];
  modeId: ForwardCompoundingModeId;
  labelJa: string;
  initialCapitalMYR: number;
  horizonYears: number | null;
  toDate: string;
  baselinePath: CompoundPathResult | null;
  baselineBankruptcyPct: number | null;
  includeBankruptcy: boolean;
}): ForwardCompoundingModeMetrics {
  const lot = lotPerSlotForCapital(input.initialCapitalMYR);
  const slice =
    input.horizonYears != null
      ? input.trades.filter(
          (t) => t.entryDate >= horizonCutoffDate(input.toDate, input.horizonYears),
        )
      : input.trades;

  const path = simulateCompoundingPath({
    trades: slice,
    modeId: input.modeId,
    initialCapitalMYR: input.initialCapitalMYR,
    lotPerSlotMYR: lot,
  });

  const bankruptcyRatePct = input.includeBankruptcy
    ? estimateCompoundingBankruptcyRate({
        trades: slice,
        modeId: input.modeId,
        initialCapitalMYR: input.initialCapitalMYR,
        lotPerSlotMYR: lot,
      })
    : 0;

  return pathToMetrics(input.modeId, input.labelJa, path, {
    initialCapitalMYR: input.initialCapitalMYR,
    lotPerSlotMYR: lot,
    horizonYears: input.horizonYears,
    bankruptcyRatePct,
    baselinePath: input.baselinePath,
    baselineBankruptcyPct: input.baselineBankruptcyPct,
  });
}

export function gradeCompoundingMode(input: {
  modeId: ForwardCompoundingModeId;
  bankruptcyRatePct: number;
  maxDrawdownPct: number;
}): ForwardCompoundingAdoptionGrade {
  if (input.bankruptcyRatePct > 12) return 'D';
  if (input.bankruptcyRatePct > 6) return 'C';
  if (input.modeId === 'compound_no') return 'C';
  if (input.modeId === 'reinvest_50' && Math.abs(input.maxDrawdownPct) < 8) return 'B';
  if (
    (input.modeId === 'compound_yes' || input.modeId === 'reinvest_100') &&
    input.bankruptcyRatePct <= 5
  ) {
    return 'A';
  }
  if (input.modeId === 'reinvest_monthly' && input.bankruptcyRatePct <= 8) return 'B';
  return 'B';
}

export function auditCompounding(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardCompoundingAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);

  const baselinePath = simulateCompoundingPath({
    trades,
    modeId: BASELINE_MODE,
    initialCapitalMYR: BASE_CAPITAL_MYR,
    lotPerSlotMYR: BASE_LOT_PER_SLOT_MYR,
  });
  const baselineBankruptcyPct = estimateCompoundingBankruptcyRate({
    trades,
    modeId: BASELINE_MODE,
    initialCapitalMYR: BASE_CAPITAL_MYR,
    lotPerSlotMYR: BASE_LOT_PER_SLOT_MYR,
  });

  const modeRows: ForwardCompoundingModeMetrics[] = [];

  for (const mode of COMPOUNDING_MODES) {
    modeRows.push(
      runModeMetrics({
        trades,
        modeId: mode.modeId,
        labelJa: mode.labelJa,
        initialCapitalMYR: BASE_CAPITAL_MYR,
        horizonYears: null,
        toDate,
        baselinePath,
        baselineBankruptcyPct,
        includeBankruptcy: true,
      }),
    );
  }

  for (const years of [5, 10, 15] as const) {
    const baseMode = COMPOUNDING_MODES[0]!;
    modeRows.push(
      runModeMetrics({
        trades,
        modeId: baseMode.modeId,
        labelJa: `${baseMode.labelJa} · ${years}年`,
        initialCapitalMYR: BASE_CAPITAL_MYR,
        horizonYears: years,
        toDate,
        baselinePath: null,
        baselineBankruptcyPct: null,
        includeBankruptcy: false,
      }),
    );
    for (let i = 1; i < COMPOUNDING_MODES.length; i++) {
      const mode = COMPOUNDING_MODES[i]!;
      modeRows.push(
        runModeMetrics({
          trades,
          modeId: mode.modeId,
          labelJa: `${mode.labelJa} · ${years}年`,
          initialCapitalMYR: BASE_CAPITAL_MYR,
          horizonYears: years,
          toDate,
          baselinePath: null,
          baselineBankruptcyPct: null,
          includeBankruptcy: false,
        }),
      );
    }
  }

  for (const capital of [10_000, 30_000] as const) {
    for (const mode of COMPOUNDING_MODES) {
      modeRows.push(
        runModeMetrics({
          trades,
          modeId: mode.modeId,
          labelJa: `${mode.labelJa} · RM${capital}`,
          initialCapitalMYR: capital,
          horizonYears: null,
          toDate,
          baselinePath: null,
          baselineBankruptcyPct: null,
          includeBankruptcy: false,
        }),
      );
    }
  }

  const fullRm3000 = modeRows.filter(
    (r) => r.initialCapitalMYR === BASE_CAPITAL_MYR && r.horizonYears == null,
  );

  const byFinal = [...fullRm3000].sort((a, b) => b.finalEquityMYR - a.finalEquityMYR);
  const bySharpe = [...fullRm3000].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  const byMar = [...fullRm3000].sort((a, b) => (b.mar ?? -999) - (a.mar ?? -999));
  const byDd = [...fullRm3000].sort(
    (a, b) => Math.abs(a.maxDrawdownPct) - Math.abs(b.maxDrawdownPct),
  );
  const byBankrupt = [...fullRm3000].sort(
    (a, b) => a.bankruptcyRatePct - b.bankruptcyRatePct,
  );

  const bestFinal = byFinal[0]!;
  const bestSharpe = bySharpe[0]!;
  const bestMar = byMar[0]!;
  const bestDd = byDd[0]!;
  const bestBankrupt = byBankrupt[0]!;

  const trades2026 = trades.filter((t) => t.signalDate >= SINCE_2026_FROM);
  const since2026Candidates = COMPOUNDING_MODES.map((mode) => {
    const path = simulateCompoundingPath({
      trades: trades2026.length > 0 ? trades2026 : trades,
      modeId: mode.modeId,
      initialCapitalMYR: BASE_CAPITAL_MYR,
      lotPerSlotMYR: BASE_LOT_PER_SLOT_MYR,
    });
    return { mode, path };
  }).sort((a, b) => b.path.cumulativeReturnPct - a.path.cumulativeReturnPct);
  const since2026Best = since2026Candidates[0]!;

  const operationalReinvestModeId: ForwardCompoundingModeId =
    bestMar.modeId === 'compound_no' ? 'reinvest_50' : 'reinvest_monthly';
  const opRow = fullRm3000.find((r) => r.modeId === operationalReinvestModeId)!;
  const operationalGrade = gradeCompoundingMode({
    modeId: operationalReinvestModeId,
    bankruptcyRatePct: opRow.bankruptcyRatePct,
    maxDrawdownPct: opRow.maxDrawdownPct,
  });

  const answerAJa = `最終資産最大: ${bestFinal.labelJa}（RM${bestFinal.finalEquityMYR} · 累積${bestFinal.cumulativeReturnPct}% · 評価${bestFinal.modeId === 'compound_yes' ? 'A' : 'B'}）`;
  const answerBJa = `Sharpe最大: ${bestSharpe.labelJa}（${bestSharpe.sharpe ?? '—'} · 評価B）`;
  const answerCJa = `MAR最大: ${bestMar.labelJa}（MAR${bestMar.mar ?? '—'} · 評価B）`;
  const answerDJa = `DD最小: ${bestDd.labelJa}（DD${bestDd.maxDrawdownPct}% · 評価${bestDd.modeId === 'compound_no' ? 'B' : 'A'}）`;
  const answerEJa =
    trades2026.length > 0
      ? `2026年以降推奨: ${since2026Best.mode.labelJa}（${trades2026.length}件 · 累積${since2026Best.path.cumulativeReturnPct}% · 評価B）`
      : `2026年以降: 取引少 · 暫定${COMPOUNDING_MODES.find((m) => m.modeId === operationalReinvestModeId)!.labelJa}`;

  const operationalNoteJa =
    `${operationalGrade}: 実運用RM3000 · RM700/枠 · 推奨再投資=${COMPOUNDING_MODES.find((m) => m.modeId === operationalReinvestModeId)!.labelJa} · ` +
    `最終RM${opRow.finalEquityMYR} · DD${opRow.maxDrawdownPct}% · 破産率${opRow.bankruptcyRatePct}%`;

  const humanSummaryJa = [
    '【最重要監査その36 · 複利運用監査】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate} · ${trades.length}件 · 基準${BASELINE_MODE}`,
    '',
    '■ RM3000 全方式',
    ...fullRm3000.map(
      (r) =>
        `${r.labelJa}: 最終RM${r.finalEquityMYR} 累積${r.cumulativeReturnPct}% DD${r.maxDrawdownPct}% ` +
        `Sharpe${r.sharpe ?? '—'} MAR${r.mar ?? '—'} 破産${r.bankruptcyRatePct}% ` +
        `(ΔDD${r.maxDrawdownDeltaPt ?? '—'} ΔSharpe${r.sharpeDelta ?? '—'})`,
    ),
    '',
    '■ 5/10/15年（RM3000）',
    ...modeRows
      .filter((r) => r.horizonYears != null && r.initialCapitalMYR === BASE_CAPITAL_MYR)
      .slice(0, 8)
      .map(
        (r) =>
          `${r.labelJa}: 最終RM${r.finalEquityMYR} 累積${r.cumulativeReturnPct}%`,
      ),
    '',
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    '',
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    tradeCount: trades.length,
    baselineModeId: BASELINE_MODE,
    modeRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalReinvestModeId,
    operationalGrade,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runCompoundingAudit(): Promise<ForwardCompoundingAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditCompounding({ bundle });
}

export function formatCompoundingCsv(report: ForwardCompoundingAuditReport): string {
  const lines = [
    `# 最重要監査その36 複利 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# baseline=${report.baselineModeId}`,
    '',
    'modeId,label,capitalMYR,lotMYR,horizonYears,trades,finalMYR,cumulative,maxDD,sharpe,mar,bankruptcyPct,ddDelta,sharpeDelta,marDelta,bankruptcyDelta',
    ...report.modeRows.map((r) =>
      [
        r.modeId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.initialCapitalMYR,
        r.lotPerSlotMYR,
        r.horizonYears ?? '',
        r.tradeCount,
        r.finalEquityMYR,
        r.cumulativeReturnPct,
        r.maxDrawdownPct,
        r.sharpe ?? '',
        r.mar ?? '',
        r.bankruptcyRatePct,
        r.maxDrawdownDeltaPt ?? '',
        r.sharpeDelta ?? '',
        r.marDelta ?? '',
        r.bankruptcyDeltaPt ?? '',
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
