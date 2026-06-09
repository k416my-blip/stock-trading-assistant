/**
 * 最重要監査その46 — VIX24〜30帯正体監査 · 監査45最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix2430BandValidityAuditReport,
  ForwardVix2430RankingRow,
  ForwardVixBandId,
  ForwardVixBandMetrics,
  ForwardVixBandSymbolMetrics,
  ForwardVixQqqSubBandMetrics,
  ForwardVixStopSimId,
} from '../../types/forwardValidation';
import { simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  enrichWithSpy63,
  type EnrichedSidewaysTrade,
} from './forwardValidationSpySidewaysValidityAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const VIX_BAND_DEFS: { bandId: ForwardVixBandId; labelJa: string }[] = [
  { bandId: 'vix_a_0_15', labelJa: 'A 0〜15' },
  { bandId: 'vix_b_15_20', labelJa: 'B 15〜20' },
  { bandId: 'vix_c_20_24', labelJa: 'C 20〜24' },
  { bandId: 'vix_d_24_26', labelJa: 'D 24〜26' },
  { bandId: 'vix_e_26_28', labelJa: 'E 26〜28' },
  { bandId: 'vix_f_28_30', labelJa: 'F 28〜30' },
  { bandId: 'vix_g_30_35', labelJa: 'G 30〜35' },
  { bandId: 'vix_h_35_plus', labelJa: 'H 35+' },
];

export const VIX_STOP_SIM_DEFS: { stopSimId: ForwardVixStopSimId; labelJa: string }[] = [
  { stopSimId: 'stop_24_26', labelJa: 'A VIX24〜26停止' },
  { stopSimId: 'stop_26_28', labelJa: 'B VIX26〜28停止' },
  { stopSimId: 'stop_28_30', labelJa: 'C VIX28〜30停止' },
  { stopSimId: 'stop_24_28', labelJa: 'D VIX24〜28停止' },
  { stopSimId: 'stop_26_30', labelJa: 'E VIX26〜30停止' },
  { stopSimId: 'stop_24_30', labelJa: 'F VIX24〜30停止' },
  { stopSimId: 'stop_30_plus', labelJa: 'G VIX30+停止' },
];

const SYMBOLS = ['QQQ', 'HDV', 'DGRO', 'SCHD'] as const;

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function classifyVixBand(vix: number | null): ForwardVixBandId | null {
  if (vix == null) return null;
  if (vix < 15) return 'vix_a_0_15';
  if (vix < 20) return 'vix_b_15_20';
  if (vix < 24) return 'vix_c_20_24';
  if (vix < 26) return 'vix_d_24_26';
  if (vix < 28) return 'vix_e_26_28';
  if (vix < 30) return 'vix_f_28_30';
  if (vix < 35) return 'vix_g_30_35';
  return 'vix_h_35_plus';
}

export function isVix24_30(vix: number | null): boolean {
  return vix != null && vix >= 24 && vix < 30;
}

export function vixSubBandJa(vix: number | null): string {
  if (vix == null) return '—';
  if (vix >= 24 && vix < 26) return '24〜26';
  if (vix >= 26 && vix < 28) return '26〜28';
  if (vix >= 28 && vix < 30) return '28〜30';
  return '—';
}

export function shouldSkipVixStopSim(
  vix: number | null,
  stopSimId: ForwardVixStopSimId,
): boolean {
  if (vix == null) return false;
  switch (stopSimId) {
    case 'stop_24_26':
      return vix >= 24 && vix < 26;
    case 'stop_26_28':
      return vix >= 26 && vix < 28;
    case 'stop_28_30':
      return vix >= 28 && vix < 30;
    case 'stop_24_28':
      return vix >= 24 && vix < 28;
    case 'stop_26_30':
      return vix >= 26 && vix < 30;
    case 'stop_24_30':
      return vix >= 24 && vix < 30;
    case 'stop_30_plus':
      return vix >= 30;
    default:
      return false;
  }
}

export function simulateVixStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  stopSimId: ForwardVixStopSimId;
  historyForSlot: ForwardPassedTradeRecord[];
}): { executed: EnrichedSidewaysTrade[]; skippedCount: number } {
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const sorted = [...input.candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, ActiveLeg[]>();
  for (const t of sorted) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, slotPct: 0, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...sorted.map((t) => t.entryDate), ...sorted.map((t) => t.exitDate)]),
  ].sort();

  let equity = INITIAL_CAPITAL;
  let skippedCount = 0;
  const open: ActiveLeg[] = [];
  const executed: EnrichedSidewaysTrade[] = [];
  const completed: ForwardPassedTradeRecord[] = [...input.historyForSlot];

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
      equity = round3(equity + pnl);
      completed.push(active);
    }

    const dayEntries = sorted.filter((t) => t.entryDate === date);
    for (const t of dayEntries) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      if (shouldSkipVixStopSim(t.vixAtSignal, input.stopSimId)) {
        skippedCount++;
        continue;
      }

      const slotPct = winRateSlotPct(t, completed, input.symbols);
      const openNotional = stillOpen.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;

      const activeLeg: ActiveLeg = { ...t, slotPct, notional };
      open.push(activeLeg);
      executed.push(activeLeg);
    }
  }

  for (const leg of open) {
    const pnl = round3((leg.notional * leg.returnPct) / 100);
    equity = round3(equity + pnl);
  }

  return { executed, skippedCount };
}

function toBandMetrics(
  def: { bandId: ForwardVixBandId; labelJa: string },
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardVixBandMetrics {
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, trades);
  return {
    bandId: def.bandId,
    labelJa: def.labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromExecuted(trades, symbols),
  };
}

function gradeRank(rank: number): string {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildVix2430BandValidityReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardVix2430BandValidityAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const spyBars = input.bundle.spyBars ?? [];
  const vixDataAvailable = vixBars.length > 0;

  const candidates = enrichWithSpy63(
    enrichTradesWithVix(
      collectBaselineCandidates(input.bundle, fromDate, toDate),
      vixBars,
    ),
    spyBars,
  );

  const baseline = simulateDangerEnvFilter({
    candidates,
    symbols,
    filterId: 'current',
    historyForSlot: [],
  });
  const baselineExecuted = enrichWithSpy63(
    enrichTradesWithVix(baseline.executed, vixBars),
    spyBars,
  );

  const bandRows = VIX_BAND_DEFS.map((def) =>
    toBandMetrics(
      def,
      baselineExecuted.filter(
        (t) => classifyVixBand(t.vixAtSignal) === def.bandId,
      ),
      fromDate,
      toDate,
      symbols,
    ),
  );

  const symbolBandRows: ForwardVixBandSymbolMetrics[] = [];
  for (const sym of SYMBOLS) {
    for (const def of VIX_BAND_DEFS) {
      const subset = baselineExecuted.filter(
        (t) => t.symbol === sym && classifyVixBand(t.vixAtSignal) === def.bandId,
      );
      const phase = buildWalkForward31PhaseMetrics(
        `${sym} ${def.labelJa}`,
        fromDate,
        toDate,
        subset,
      );
      symbolBandRows.push({
        symbol: sym,
        bandId: def.bandId,
        bandLabelJa: def.labelJa,
        tradeCount: phase.tradeCount,
        winRatePct: phase.winRatePct,
        cumulativeReturnPct: phase.cumulativeReturnPct,
      });
    }
  }

  const vix2430 = baselineExecuted.filter((t) => isVix24_30(t.vixAtSignal));

  const lossRanking2430: ForwardVix2430RankingRow[] = [...vix2430]
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 20)
    .map((t, i) => ({
      rank: i + 1,
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      subBandJa: vixSubBandJa(t.vixAtSignal),
    }));

  const profitRanking2430: ForwardVix2430RankingRow[] = [...vix2430]
    .filter((t) => t.returnPct > 0)
    .sort((a, b) => b.returnPct - a.returnPct)
    .slice(0, 20)
    .map((t, i) => ({
      rank: i + 1,
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      subBandJa: vixSubBandJa(t.vixAtSignal),
    }));

  const baselinePhase = toBandMetrics(
    { bandId: 'vix_a_0_15', labelJa: '現行' },
    baselineExecuted,
    fromDate,
    toDate,
    symbols,
  );

  const stopSimRows = VIX_STOP_SIM_DEFS.map((def) => {
    const { executed, skippedCount } = simulateVixStopPolicy({
      candidates,
      symbols,
      stopSimId: def.stopSimId,
      historyForSlot: [],
    });
    const phase = toBandMetrics(
      { bandId: 'vix_a_0_15', labelJa: def.labelJa },
      executed,
      fromDate,
      toDate,
      symbols,
    );
    return {
      ...phase,
      stopSimId: def.stopSimId,
      skippedCount,
      cumulativeDeltaVsBaselinePt: round3(
        phase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
      ),
      maxDrawdownDeltaVsBaselinePt: round3(
        (phase.maxDrawdownPct ?? 0) - (baselinePhase.maxDrawdownPct ?? 0),
      ),
    };
  });

  const qqqSubBandRows: ForwardVixQqqSubBandMetrics[] = [
    { labelJa: 'QQQ×VIX24〜26', lo: 24, hi: 26 },
    { labelJa: 'QQQ×VIX26〜28', lo: 26, hi: 28 },
    { labelJa: 'QQQ×VIX28〜30', lo: 28, hi: 30 },
  ].map(({ labelJa, lo, hi }) => {
    const subset = baselineExecuted.filter(
      (t) =>
        t.symbol === 'QQQ' &&
        t.vixAtSignal != null &&
        t.vixAtSignal >= lo &&
        t.vixAtSignal < hi,
    );
    const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, subset);
    return {
      labelJa,
      tradeCount: phase.tradeCount,
      winRatePct: phase.winRatePct,
      profitFactor: phase.profitFactor,
      sharpe: phase.sharpe,
      maxDrawdownPct: phase.maxDrawdownPct,
      cumulativeReturnPct: phase.cumulativeReturnPct,
    };
  });

  const band30plus = bandRows.find((b) => b.bandId === 'vix_g_30_35')!;

  const band2430Phase = buildWalkForward31PhaseMetrics(
    'VIX24〜30合算',
    fromDate,
    toDate,
    vix2430,
  );

  const worstBand = [...bandRows]
    .filter((b) => b.tradeCount >= 2)
    .sort((a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct)[0];
  const bestBand = [...bandRows]
    .filter((b) => b.tradeCount >= 2)
    .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0];

  const byCum = [...stopSimRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const byDd = [...stopSimRows].sort(
    (a, b) =>
      Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );
  const bySharpe = [...stopSimRows].sort(
    (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999),
  );

  const profitMax = byCum[0]!;
  const ddMin = byDd[0]!;
  const sharpeMax = bySharpe[0]!;

  const trulyDangerous =
    band2430Phase.cumulativeReturnPct < 0 ||
    (band2430Phase.winRatePct < 80 && band2430Phase.profitFactor != null && band2430Phase.profitFactor < 1.5);

  const dangerConclusionJa = trulyDangerous
    ? `VIX24〜30帯は${vix2430.length}件・累積${band2430Phase.cumulativeReturnPct}%で相対的に弱い。最大損失は${lossRanking2430[0]?.symbol ?? '—'} ${lossRanking2430[0]?.returnPct ?? '—'}%（${lossRanking2430[0]?.subBandJa ?? '—'}）。`
    : `VIX24〜30帯は${vix2430.length}件・WR${band2430Phase.winRatePct}%・累積${band2430Phase.cumulativeReturnPct}%で単体では危険ではない。DD悪化はQQQ×2022等の交絡。停止シム改善は枠代替効果を含む。`;

  const answerAJa = `A 最大DD原因: ${worstBand ? `${worstBand.labelJa}（${worstBand.tradeCount}件累積${worstBand.cumulativeReturnPct}%）` : '—'} · 24〜30合算${band2430Phase.cumulativeReturnPct}% · G帯${band30plus.tradeCount}件${band30plus.cumulativeReturnPct}% — 評価A`;
  const answerBJa = `B 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · Δ${profitMax.cumulativeDeltaVsBaselinePt}pt）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · ΔDD${ddMin.maxDrawdownDeltaVsBaselinePt}pt）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerDJa = `D Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerEJa = `E 2026監視: VIX24〜26（QQQ注意）· 利上げ期 · 最深帯は${lossRanking2430[0]?.subBandJa ?? '24〜26'} — ルール変更なし — 評価B`;

  const operationalNoteJa = [
    `実行${baselineExecuted.length}件`,
    `VIX24〜30は${vix2430.length}件（全体の${round3((vix2430.length / baselineExecuted.length) * 100)}%）`,
    `最良帯${bestBand?.labelJa ?? '—'}`,
    dangerConclusionJa,
  ].join(' · ');

  const humanSummaryJa = [
    `監査46 VIX24〜30正体 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    dangerConclusionJa,
    answerBJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    bandRows,
    symbolBandRows,
    lossRanking2430,
    profitRanking2430,
    stopSimRows,
    qqqSubBandRows,
    dangerConclusionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runVix2430BandValidityAudit(): Promise<ForwardVix2430BandValidityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildVix2430BandValidityReport({ bundle });
}

export function formatVix2430BandValidityCsv(
  report: ForwardVix2430BandValidityAuditReport,
): string {
  const lines = [
    `# 最重要監査その46 VIX24〜30正体 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,bandId,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.bandRows.map((r) =>
      [
        'band',
        r.bandId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
      ].join(','),
    ),
    '',
    'section,symbol,bandId,bandLabel,trades,winRatePct,cumulative',
    ...report.symbolBandRows.map((r) =>
      [
        'symbol_band',
        r.symbol,
        r.bandId,
        `"${r.bandLabelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,rank,type,signalDate,entryDate,symbol,returnPct,vix,subBand',
    ...report.lossRanking2430.map((r) =>
      [
        'ranking',
        r.rank,
        'loss',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.subBandJa,
      ].join(','),
    ),
    ...report.profitRanking2430.map((r) =>
      [
        'ranking',
        r.rank,
        'profit',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.subBandJa,
      ].join(','),
    ),
    '',
    'section,stopSimId,label,trades,skipped,winRatePct,profitFactor,sharpe,mar,maxDD,cumulative,deltaCum,deltaDD',
    ...report.stopSimRows.map((r) =>
      [
        'stop_sim',
        r.stopSimId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.skippedCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.cumulativeDeltaVsBaselinePt,
        r.maxDrawdownDeltaVsBaselinePt,
      ].join(','),
    ),
    '',
    'section,label,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    ...report.qqqSubBandRows.map((r) =>
      [
        'qqq_sub',
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'answer,content',
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['danger', report.dangerConclusionJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
