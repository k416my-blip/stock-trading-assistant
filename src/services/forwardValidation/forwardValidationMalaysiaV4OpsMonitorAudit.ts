/**
 * 最重要監査その80 — Malaysia v4 運用監視設計 · 監査79確定版 · ルール変更なし
 */
import type { PortfolioPosition } from '../../types';
import type {
  ForwardMalaysiaV4OpsAllocationRow,
  ForwardMalaysiaV4OpsConcentration,
  ForwardMalaysiaV4OpsMonitorAuditReport,
  ForwardMalaysiaV4OpsRiskLevel,
  ForwardMalaysiaV4OpsSymbolMonthlyRow,
  ForwardMalaysiaV4OpsSymbolSnapshot,
  ForwardMalaysiaV4YtlWarningLevel,
} from '../../types/forwardValidation';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { symbolNetProfitContributionPct } from './forwardValidationMalaysiaV3Cap15Audit';
import {
  simulateMalaysiaV3DcaPath,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
} from './forwardValidationMalaysiaV3DcaAudit';
import {
  buildV4PhaseWeights,
  fetchMalaysiaV76AuditBundle,
  resolveV4TradeSymbols,
} from './forwardValidationMalaysiaV4CandidateAudit';
import { V4_PHASE2_SYMBOLS } from './forwardValidationMalaysiaV4AttributionAudit';
import { buildSymbolWeightPctMap } from '../metaDecisionPortfolioWeights';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const IJM_SYMBOL = '3336';
const YTL_SYMBOL = '6742';
const YTL_CAP_PCT = 15;
const MONTHLY_DCA = 1500;
const REBALANCE_TOLERANCE_PCT = 3;

export const MALAYSIA_V4_TARGET_WEIGHTS: Record<string, number> = {
  '5347': 23.3,
  '1023': 23.3,
  '5398': 15.0,
  '6742': 15.0,
  '3336': 23.3,
};

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '1023': 'CIMB',
  '5398': 'GAMUDA',
  '6742': 'YTL',
  '3336': 'IJM',
};

const FIXED_CONDITIONS_JA =
  'MY v4運用監視 · TENAGA23.3/CIMB23.3/GAMUDA15/YTL15/IJM23.3 · 監査79確定 · ルール変更なし';

const TARGET_WEIGHTS_JA = 'TENAGA23.3% · CIMB23.3% · GAMUDA15% · YTL15% · IJM23.3%';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function cumulativeFromPath(path: MalaysiaV3DcaPathResult): number {
  return path.totalContributedMYR > 0
    ? round3(((path.finalEquityMYR - path.totalContributedMYR) / path.totalContributedMYR) * 100)
    : 0;
}

function profitFactorFromPnls(pnls: number[]): number | null {
  const wins = pnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const losses = pnls.filter((p) => p < 0).reduce((s, p) => s + Math.abs(p), 0);
  if (losses <= 0) return wins > 0 ? null : null;
  return round3(wins / losses);
}

function winRatePct(trades: { pnlMYR: number }[]): number {
  if (trades.length === 0) return 0;
  return round3((trades.filter((t) => t.pnlMYR > 0).length / trades.length) * 100);
}

function maxDrawdownFromPnls(pnls: number[]): number {
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const p of pnls) {
    equity = round3(equity + p);
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((equity - peak) / peak) * 100 : equity < 0 ? -100 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  return round3(maxDd);
}

export function computeHhi(weightsPct: number[]): number {
  return round3(weightsPct.reduce((s, w) => s + (w / 100) ** 2, 0));
}

export function resolveYtlWarningLevel(ytlDepPct: number): {
  level: ForwardMalaysiaV4YtlWarningLevel;
  labelJa: string;
} {
  if (ytlDepPct >= 50) {
    return { level: 'warn50', labelJa: 'CRITICAL 50%超 — YTL依存50%到達' };
  }
  if (ytlDepPct >= 45) {
    return { level: 'warn45', labelJa: 'RED 45% — YTL依存45%到達' };
  }
  if (ytlDepPct >= 40) {
    return { level: 'warn40', labelJa: 'ORANGE 40% — YTL依存40%到達' };
  }
  if (ytlDepPct >= 35) {
    return { level: 'warn35', labelJa: 'YELLOW 35% — YTL依存35%到達' };
  }
  return { level: 'none', labelJa: '正常 — YTL依存35%未満' };
}

export function computeConcentration(
  snapshots: ForwardMalaysiaV4OpsSymbolSnapshot[],
): ForwardMalaysiaV4OpsConcentration {
  const contribs = snapshots.map((s) => Math.max(0, s.profitContributionPct));
  const total = contribs.reduce((s, v) => s + v, 0);
  const weights =
    total > 0 ? contribs.map((c) => (c / total) * 100) : snapshots.map(() => 100 / snapshots.length);
  const sorted = [...contribs].sort((a, b) => b - a);
  const hhi = computeHhi(weights);
  return {
    hhi,
    top1ProfitContributionPct: round3(sorted[0] ?? 0),
    top2ProfitContributionPct: round3((sorted[0] ?? 0) + (sorted[1] ?? 0)),
    effectiveN: hhi > 0 ? round3(1 / hhi) : snapshots.length,
  };
}

export function assessOpsRiskLevel(input: {
  ytlDependencyPct: number;
  hhi: number;
  top1Pct: number;
}): { level: ForwardMalaysiaV4OpsRiskLevel; labelJa: string } {
  if (input.ytlDependencyPct >= 45 || input.hhi >= 0.35 || input.top1Pct >= 50) {
    return { level: 'red', labelJa: 'Red — YTL依存・集中度が危険域' };
  }
  if (input.ytlDependencyPct >= 40 || input.hhi >= 0.3 || input.top1Pct >= 40) {
    return { level: 'orange', labelJa: 'Orange — 依存・集中の警戒強化' };
  }
  if (input.ytlDependencyPct >= 35 || input.hhi >= 0.25 || input.top1Pct >= 35) {
    return { level: 'yellow', labelJa: 'Yellow — 監視強化（閾値接近）' };
  }
  return { level: 'green', labelJa: 'Green — 運用監視正常範囲' };
}

function buildSymbolSnapshots(
  ledger: MalaysiaV3DcaExecutedTrade[],
  symbols: readonly string[],
): ForwardMalaysiaV4OpsSymbolSnapshot[] {
  const totalNet = round3(ledger.reduce((s, t) => s + t.pnlMYR, 0));
  return symbols.map((sym) => {
    const rows = ledger.filter((t) => t.symbol === sym);
    const pnls = rows.map((t) => t.pnlMYR);
    const totalPnl = round3(pnls.reduce((s, p) => s + p, 0));
    return {
      symbol: sym,
      symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
      profitContributionPct:
        totalNet !== 0 ? round3((totalPnl / totalNet) * 100) : symbolNetProfitContributionPct(ledger, sym),
      winRatePct: winRatePct(rows),
      profitFactor: profitFactorFromPnls(pnls),
      maxDrawdownPct: maxDrawdownFromPnls(pnls),
      cumulativePnlMYR: totalPnl,
      tradeCount: rows.length,
    };
  });
}

function buildMonthlyRows(
  ledger: MalaysiaV3DcaExecutedTrade[],
  symbols: readonly string[],
): ForwardMalaysiaV4OpsSymbolMonthlyRow[] {
  const months = [
    ...new Set(ledger.map((t) => t.exitDate.slice(0, 7))),
  ].sort();
  const rows: ForwardMalaysiaV4OpsSymbolMonthlyRow[] = [];
  for (const yearMonth of months) {
    const monthLedger = ledger.filter((t) => t.exitDate.startsWith(yearMonth));
    const monthTotal = round3(monthLedger.reduce((s, t) => s + t.pnlMYR, 0));
    for (const sym of symbols) {
      const symRows = monthLedger.filter((t) => t.symbol === sym);
      if (symRows.length === 0) continue;
      const pnls = symRows.map((t) => t.pnlMYR);
      const symPnl = round3(pnls.reduce((s, p) => s + p, 0));
      rows.push({
        yearMonth,
        symbol: sym,
        symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
        tradeCount: symRows.length,
        profitContributionPct: monthTotal !== 0 ? round3((symPnl / monthTotal) * 100) : 0,
        winRatePct: winRatePct(symRows),
        profitFactor: profitFactorFromPnls(pnls),
        maxDrawdownPct: maxDrawdownFromPnls(pnls),
        cumulativePnlMYR: symPnl,
      });
    }
  }
  return rows;
}

function ledgerImpliedWeights(ledger: MalaysiaV3DcaExecutedTrade[]): Record<string, number> {
  const phase4 = ledger.filter((t) => t.phase === 'phase4');
  const total = phase4.reduce((s, t) => s + t.notionalMYR, 0);
  const out: Record<string, number> = {};
  if (total <= 0) return out;
  for (const sym of V4_PHASE2_SYMBOLS) {
    const symTotal = phase4.filter((t) => t.symbol === sym).reduce((s, t) => s + t.notionalMYR, 0);
    out[sym] = round3((symTotal / total) * 100);
  }
  return out;
}

function mapHoldingsToBursaWeights(holdings: PortfolioPosition[]): Record<string, number> {
  const myHoldings = holdings.filter((p) => p.market === 'my' && (p.shares ?? 0) > 0);
  const raw = buildSymbolWeightPctMap(myHoldings);
  const out: Record<string, number> = {};
  for (const [sym, pct] of Object.entries(raw)) {
    const core = sym.replace(/\.KL$/i, '').replace(/:KL$/i, '');
    out[core] = round3(pct);
  }
  return out;
}

export function buildAllocationComparison(input: {
  currentWeights: Record<string, number>;
  sourceLabelJa: string;
}): {
  rows: ForwardMalaysiaV4OpsAllocationRow[];
  sellCandidates: string[];
  buyCandidates: string[];
  proposalJa: string;
} {
  const rows: ForwardMalaysiaV4OpsAllocationRow[] = [];
  const sellCandidates: string[] = [];
  const buyCandidates: string[] = [];

  for (const sym of V4_PHASE2_SYMBOLS) {
    const recommended = MALAYSIA_V4_TARGET_WEIGHTS[sym] ?? 0;
    const current = input.currentWeights[sym] ?? 0;
    const delta = round3(current - recommended);
    let action: ForwardMalaysiaV4OpsAllocationRow['action'] = 'hold';
    if (delta > REBALANCE_TOLERANCE_PCT) {
      action = 'sell';
      sellCandidates.push(SYMBOL_NAMES[sym] ?? sym);
    } else if (delta < -REBALANCE_TOLERANCE_PCT) {
      action = 'buy';
      buyCandidates.push(SYMBOL_NAMES[sym] ?? sym);
    }
    rows.push({
      symbol: sym,
      symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
      recommendedWeightPct: recommended,
      currentWeightPct: current,
      deltaWeightPct: delta,
      action,
    });
  }

  const proposalJa =
    sellCandidates.length === 0 && buyCandidates.length === 0
      ? `${input.sourceLabelJa}: 推奨配分±${REBALANCE_TOLERANCE_PCT}%以内 — リバランス不要`
      : `${input.sourceLabelJa}: 売却候補[${sellCandidates.join('・') || '—'}] · 購入候補[${buyCandidates.join('・') || '—'}] · ±${REBALANCE_TOLERANCE_PCT}%超の銘柄を調整`;

  return { rows, sellCandidates, buyCandidates, proposalJa };
}

export async function buildMalaysiaV4OpsMonitorAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  holdings?: PortfolioPosition[];
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4OpsMonitorAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

  const symbols = resolveV4TradeSymbols({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  }).filter((s) => input.bundle.fetchedSymbols.includes(s));

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols,
    fromDate,
    toDate,
  });

  const trades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const phaseWeights = buildV4PhaseWeights({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  });

  const path = simulateMalaysiaV3DcaPath({
    trades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger = path.executedTrades ?? [];

  const symbolSnapshots = buildSymbolSnapshots(ledger, V4_PHASE2_SYMBOLS);
  const monthlyRows = buildMonthlyRows(ledger, V4_PHASE2_SYMBOLS);
  const concentration = computeConcentration(symbolSnapshots);

  const ytlDependencyPct = symbolNetProfitContributionPct(ledger, YTL_SYMBOL);
  const ytlWarn = resolveYtlWarningLevel(ytlDependencyPct);
  const risk = assessOpsRiskLevel({
    ytlDependencyPct,
    hhi: concentration.hhi,
    top1Pct: concentration.top1ProfitContributionPct,
  });

  const hasHoldings = (input.holdings?.length ?? 0) > 0;
  const currentWeights = hasHoldings
    ? mapHoldingsToBursaWeights(input.holdings!)
    : ledgerImpliedWeights(ledger);
  const sourceLabelJa = hasHoldings ? '実保有比率' : 'ledger想定比率(Phase4平均)';
  const alloc = buildAllocationComparison({ currentWeights, sourceLabelJa });

  const answerAJa = `A YTL依存監視: ${ytlDependencyPct}% · ${ytlWarn.labelJa}`;
  const answerBJa = `B 集中度: HHI${concentration.hhi} · 上位1位${concentration.top1ProfitContributionPct}% · 上位2位${concentration.top2ProfitContributionPct}% · 実効N${concentration.effectiveN}`;
  const answerCJa = `C 銘柄別: ${symbolSnapshots.map((s) => `${s.symbolNameJa}寄与${s.profitContributionPct}%/勝率${s.winRatePct}%/PF${s.profitFactor ?? '—'}`).join(' · ')}`;
  const answerDJa = `D リスク判定: ${risk.labelJa} (${risk.level.toUpperCase()})`;
  const answerEJa = `E 月次集計: ${monthlyRows.length}行 · 直近月${monthlyRows[monthlyRows.length - 1]?.yearMonth ?? '—'}`;
  const answerFJa = `F 配分比較: ${alloc.proposalJa}`;

  const jsonPayload = JSON.stringify(
    {
      auditedAt,
      fromDate,
      toDate,
      riskLevel: risk.level,
      ytlDependencyPct,
      ytlWarningLevel: ytlWarn.level,
      concentration,
      symbolSnapshots,
      monthlyRows,
      allocationRows: alloc.rows,
      sellCandidates: alloc.sellCandidates,
      buyCandidates: alloc.buyCandidates,
      portfolioCumulativeReturnPct: cumulativeFromPath(path),
    },
    null,
    2,
  );

  const humanSummaryJa = [
    '監査80 Malaysia v4 運用監視設計',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    TARGET_WEIGHTS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    `累積${cumulativeFromPath(path)}% · ${risk.labelJa}`,
    '監査79確定版 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    targetWeightsJa: TARGET_WEIGHTS_JA,
    ytlDependencyPct,
    ytlWarningLevel: ytlWarn.level,
    ytlWarningLabelJa: ytlWarn.labelJa,
    concentration,
    symbolSnapshots,
    monthlyRows,
    riskLevel: risk.level,
    riskLabelJa: risk.labelJa,
    allocationRows: alloc.rows,
    sellCandidates: alloc.sellCandidates,
    buyCandidates: alloc.buyCandidates,
    rebalanceProposalJa: alloc.proposalJa,
    portfolioCumulativeReturnPct: cumulativeFromPath(path),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa: '監査79確定版 · ルール変更なし',
    humanSummaryJa,
    jsonPayload,
  };
}

export async function runMalaysiaV4OpsMonitorAudit(
  holdings?: PortfolioPosition[],
): Promise<ForwardMalaysiaV4OpsMonitorAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4OpsMonitorAuditReport({ bundle, holdings });
}

export function formatMalaysiaV4OpsMonitorCsv(
  report: ForwardMalaysiaV4OpsMonitorAuditReport,
): string {
  const lines = [
    `# 最重要監査その80 v4運用監視 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.riskLabelJa}`,
    '',
    'section,metric,value',
    ['summary', 'ytlDependencyPct', report.ytlDependencyPct].join(','),
    ['summary', 'ytlWarning', report.ytlWarningLevel].join(','),
    ['summary', 'hhi', report.concentration.hhi].join(','),
    ['summary', 'top1Pct', report.concentration.top1ProfitContributionPct].join(','),
    ['summary', 'top2Pct', report.concentration.top2ProfitContributionPct].join(','),
    ['summary', 'riskLevel', report.riskLevel].join(','),
    ['summary', 'cumulativePct', report.portfolioCumulativeReturnPct].join(','),
    '',
    'section,symbol,contrib,winRate,pf,maxDD,cumPnl,trades',
    ...report.symbolSnapshots.map((s) =>
      [
        'symbol',
        s.symbolNameJa,
        s.profitContributionPct,
        s.winRatePct,
        s.profitFactor ?? '',
        s.maxDrawdownPct,
        s.cumulativePnlMYR,
        s.tradeCount,
      ].join(','),
    ),
    '',
    'section,month,symbol,contrib,winRate,pf,maxDD,cumPnl,trades',
    ...report.monthlyRows.map((m) =>
      [
        'monthly',
        m.yearMonth,
        m.symbolNameJa,
        m.profitContributionPct,
        m.winRatePct,
        m.profitFactor ?? '',
        m.maxDrawdownPct,
        m.cumulativePnlMYR,
        m.tradeCount,
      ].join(','),
    ),
    '',
    'section,symbol,recommended,current,delta,action',
    ...report.allocationRows.map((a) =>
      ['alloc', a.symbolNameJa, a.recommendedWeightPct, a.currentWeightPct, a.deltaWeightPct, a.action].join(
        ',',
      ),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
  ];
  return lines.join('\n');
}
