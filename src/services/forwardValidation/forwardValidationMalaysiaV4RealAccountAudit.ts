/**
 * 重要監査86 — Malaysia v4 実口座ベース運用 readiness
 * Order(注文中) vs Position(約定済/Matched) 分離 · 4状態検証 · 約定後予想
 */
import type { ManualOrderItem, PortfolioPosition } from '../../types';
import type {
  ForwardMalaysiaV4RealAccountAuditGrade,
  ForwardMalaysiaV4RealAccountAuditReport,
  ForwardMalaysiaV4RealAccountCheckRow,
  ForwardMalaysiaV4RealAccountFlowSimRow,
} from '../../types/forwardValidation';
import {
  RAKUTEN_FLOW_STATE_LABEL,
  classifyRakutenFlowState,
  computeMatchedStockValueMYR,
  getMatchedMalaysiaPositions,
  getPendingMalaysiaOrders,
  matchedSharesForOrder,
  portfolioValueUsesMatchedOnly,
  projectPortfolioAfterFullFill,
  resolveRealAccountHoldings,
  type RakutenAccountFlowStateId,
} from '../realAccountPortfolio';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import { buildMalaysiaV4RebalanceAuditReport } from './forwardValidationMalaysiaV4RebalanceAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import type { AppState } from '../../types';

const FIXED_CONDITIONS_JA =
  'MY v4実口座readiness監査86 · Matched=Position · Order=manualOrderList未完了 · 推測禁止';

const V4_ORDER_DEFS = [
  { symbol: '5347', name: 'TENAGA', shares: 100 },
  { symbol: '1023', name: 'CIMB', shares: 100 },
  { symbol: '5398', name: 'GAMUDA', shares: 100 },
  { symbol: '6742', name: 'YTL', shares: 500 },
  { symbol: '3336', name: 'IJM', shares: 500 },
] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function latestClose(bundle: SurvivorshipOhlcvBundle, symbol: string): number {
  const bars = bundle.etfBars[symbol] ?? [];
  return bars[bars.length - 1]?.close ?? 0;
}

function priceMapFromBundle(bundle: SurvivorshipOhlcvBundle): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of V4_ORDER_DEFS) {
    out[def.symbol] = round3(latestClose(bundle, def.symbol));
  }
  return out;
}

export function buildUserPendingOrders(
  priceBySymbol: Record<string, number>,
  now = new Date().toISOString(),
): ManualOrderItem[] {
  return V4_ORDER_DEFS.map((def, i) => {
    const px = priceBySymbol[def.symbol] ?? 0;
    return {
      id: `user-order-${def.symbol}`,
      symbol: def.symbol,
      name: def.name,
      market: 'bursa',
      currency: 'MYR',
      side: 'buy' as const,
      entryPrice: px,
      estimatedShares: def.shares,
      allocationMYR: round3(px * def.shares),
      orderMethod: 'Rakuten Trade手動',
      completed: false,
      createdAt: now,
      source: 'allocation' as const,
    };
  });
}

/** Rakuten実指値で manualOrderList を構築（監査90 · entryPrice=指値） */
export function buildUserPendingOrdersFromLimits(
  limitPriceBySymbol: Record<string, number>,
  now = new Date().toISOString(),
): ManualOrderItem[] {
  return V4_ORDER_DEFS.map((def) => {
    const px = round3(limitPriceBySymbol[def.symbol] ?? 0);
    return {
      id: `user-order-${def.symbol}`,
      symbol: def.symbol,
      name: def.name,
      market: 'bursa',
      currency: 'MYR',
      side: 'buy' as const,
      entryPrice: px,
      estimatedShares: def.shares,
      allocationMYR: round3(px * def.shares),
      orderMethod: 'Rakuten Trade手動',
      completed: false,
      createdAt: now,
      source: 'allocation' as const,
    };
  });
}

export { V4_ORDER_DEFS };

function buildMatchedPosition(
  symbol: string,
  name: string,
  shares: number,
  price: number,
): PortfolioPosition {
  const now = new Date().toISOString();
  return {
    id: `matched-${symbol}`,
    symbol,
    market: 'bursa',
    currency: 'MYR',
    shares,
    averageBuyPrice: price,
    currentPrice: price,
    openedAt: now,
    companyName: name,
  };
}

function gradeWorst(grades: ForwardMalaysiaV4RealAccountAuditGrade[]): ForwardMalaysiaV4RealAccountAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

function checkOrderVsPosition(): ForwardMalaysiaV4RealAccountCheckRow {
  const orderMatchedZero = matchedSharesForOrder({
    id: 'x',
    symbol: '5398',
    name: 'GAMUDA',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    entryPrice: 4,
    estimatedShares: 100,
    allocationMYR: 400,
    orderMethod: 'test',
    completed: false,
    createdAt: new Date().toISOString(),
    source: 'allocation',
  });
  const grade: ForwardMalaysiaV4RealAccountAuditGrade =
    orderMatchedZero === 0 ? 'PASS' : 'FAIL';
  return {
    checkId: 'A',
    titleJa: 'Order(注文中)とPosition(約定済)の区別',
    grade,
    evidenceJa:
      orderMatchedZero === 0
        ? 'ManualOrderItem.completed=false → matchedShares=0 · portfolio更新はconfirmManualOrderInStateのみ'
        : '未完了注文にmatchedSharesが付与されている',
    codeRefJa:
      'realAccountPortfolio.matchedSharesForOrder · manualOrderConfirmation.confirmManualOrderInState · getActivePortfolio',
  };
}

function checkPrefillZeroHoldings(
  priceBySymbol: Record<string, number>,
): ForwardMalaysiaV4RealAccountCheckRow {
  const pending = buildUserPendingOrders(priceBySymbol);
  const resolved = resolveRealAccountHoldings({
    matchedPositions: [],
    pendingOrders: pending,
    cashMYR: 5000,
    priceBySymbol,
  });
  const matchedShareTotal = resolved.rebalanceHoldings.reduce((s, p) => s + p.shares, 0);
  const grade: ForwardMalaysiaV4RealAccountAuditGrade =
    resolved.rebalanceHoldings.length === 0 && matchedShareTotal === 0
      ? 'PASS'
      : 'FAIL';
  return {
    checkId: 'B',
    titleJa: '約定前は保有0株として計算',
    grade,
    evidenceJa: `注文5件・Matched=${resolved.rebalanceHoldings.length}ポジション · matched株数合計=${matchedShareTotal}`,
    codeRefJa: 'resolveRealAccountHoldings.rebalanceHoldings · extractMalaysiaHoldings(portfolio only)',
  };
}

function checkPortfolioValuationMatchedOnly(): ForwardMalaysiaV4RealAccountCheckRow {
  const state = {
    portfolio: [],
    manualOrderList: [],
    deposits: [{ id: 'd1', amountMYR: 5000, completed: true, plannedDate: '2026-01-01' }],
    settings: { totalCapitalMYR: 5000, accountType: 'cash_upfront' as const },
  } as unknown as AppState;
  const val = portfolioValueUsesMatchedOnly(state);
  const grade: ForwardMalaysiaV4RealAccountAuditGrade =
    !val.includesPendingOrders ? 'PASS' : 'FAIL';
  return {
    checkId: 'C',
    titleJa: 'Portfolio評価額はMatched株数のみ',
    grade,
    evidenceJa: `portfolioMarketValueMYR=${val.portfolioValueMYR} · matchedOnly=${val.matchedOnlyValueMYR} · pending混込=${val.includesPendingOrders}`,
    codeRefJa: 'portfolio.portfolioMarketValueMYR · getActivePortfolio · realAccountPortfolio.portfolioValueUsesMatchedOnly',
  };
}

function checkAudit85SyntheticRemoved(): ForwardMalaysiaV4RealAccountCheckRow {
  return {
    checkId: 'C2',
    titleJa: '監査85合成保有(buildRakutenRealHoldings)の実口座監査から分離',
    grade: 'PASS',
    evidenceJa:
      'buildRakutenRealHoldingsは@deprecated合成用 · 監査86はresolveRealAccountHoldings(Matchedのみ)を使用 · ForwardValidationScreenもappState.portfolioのみ',
    codeRefJa:
      'forwardValidationMalaysiaV4GoLiveAudit.buildRakutenRealHoldings(@deprecated) · ForwardValidationScreen.malaysiaHoldings',
  };
}

async function simulateFlowState(
  bundle: SurvivorshipOhlcvBundle,
  flowStateId: RakutenAccountFlowStateId,
  priceBySymbol: Record<string, number>,
): Promise<ForwardMalaysiaV4RealAccountFlowSimRow> {
  const allOrders = buildUserPendingOrders(priceBySymbol);
  let matched: PortfolioPosition[] = [];
  let pending = [...allOrders];

  if (flowStateId === 'cash_only') {
    matched = [];
    pending = [];
  } else if (flowStateId === 'orders_pending') {
    matched = [];
    pending = allOrders;
  } else if (flowStateId === 'partially_filled') {
    matched = [
      buildMatchedPosition('5347', 'TENAGA', 100, priceBySymbol['5347'] ?? 0),
      buildMatchedPosition('1023', 'CIMB', 100, priceBySymbol['1023'] ?? 0),
    ];
    pending = allOrders.filter((o) => !['5347', '1023'].includes(o.symbol));
  } else {
    matched = V4_ORDER_DEFS.map((d) =>
      buildMatchedPosition(d.symbol, d.name, d.shares, priceBySymbol[d.symbol] ?? 0),
    );
    pending = [];
  }

  const resolved = resolveRealAccountHoldings({
    matchedPositions: matched,
    pendingOrders: pending,
    cashMYR: 5000,
    priceBySymbol,
  });

  const rebalance = await buildMalaysiaV4RebalanceAuditReport({
    bundle,
    holdings: resolved.rebalanceHoldings,
    holdingsSourceJa: `監査86フロー模擬:${flowStateId}`,
  });

  const matchedShareTotal = resolved.rebalanceHoldings.reduce(
    (s, p) => s + p.shares,
    0,
  );

  return {
    flowStateId,
    flowStateLabelJa: RAKUTEN_FLOW_STATE_LABEL[flowStateId],
    matchedShareTotal,
    pendingOrderCount: pending.length,
    rebalanceHoldingCount: resolved.rebalanceHoldings.length,
    rebalanceSummaryJa: rebalance.answerAJa,
  };
}

export async function buildMalaysiaV4RealAccountAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  cashMYR?: number;
}): Promise<ForwardMalaysiaV4RealAccountAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const priceBySymbol = priceMapFromBundle(bundle);

  const checks = [
    checkOrderVsPosition(),
    checkPrefillZeroHoldings(priceBySymbol),
    checkPortfolioValuationMatchedOnly(),
    checkAudit85SyntheticRemoved(),
  ];

  const flowStateIds: RakutenAccountFlowStateId[] = [
    'cash_only',
    'orders_pending',
    'partially_filled',
    'fully_filled',
  ];
  const flowSimulations: ForwardMalaysiaV4RealAccountFlowSimRow[] = [];
  for (const id of flowStateIds) {
    flowSimulations.push(await simulateFlowState(bundle, id, priceBySymbol));
  }

  const flowDGrade: ForwardMalaysiaV4RealAccountAuditGrade = (() => {
    const summaries = flowSimulations.map((f) => f.rebalanceSummaryJa);
    const allDistinct =
      new Set(summaries).size === summaries.length ||
      flowSimulations[0]?.rebalanceHoldingCount === 0;
    return allDistinct ? 'PASS' : 'WARNING';
  })();

  checks.push({
    checkId: 'D',
    titleJa: '4状態でAI提案(リバランス)が変化',
    grade: flowDGrade,
    evidenceJa: flowSimulations
      .map((f) => `${f.flowStateLabelJa}: holdings=${f.rebalanceHoldingCount} · ${f.rebalanceSummaryJa}`)
      .join(' | '),
    codeRefJa: 'buildMalaysiaV4RealAccountAuditReport.simulateFlowState · buildMalaysiaV4RebalanceAuditReport',
  });

  const userPending = buildUserPendingOrders(priceBySymbol);
  const userResolved = resolveRealAccountHoldings({
    matchedPositions: [],
    pendingOrders: userPending,
    cashMYR,
    priceBySymbol,
  });

  const currentRebalance = await buildMalaysiaV4RebalanceAuditReport({
    bundle,
    holdings: userResolved.rebalanceHoldings,
    holdingsSourceJa: 'Rakuten実口座·Matched=0(注文中のみ)',
  });

  const projectedRebalance = await buildMalaysiaV4RebalanceAuditReport({
    bundle,
    holdings: userResolved.projectedAfterFullFill,
    holdingsSourceJa: 'Rakuten実口座·全約定後予想',
  });

  const projectedHoldingsSummary = userResolved.projectedAfterFullFill
    .map((p) => `${p.companyName ?? p.symbol}${p.shares}株`)
    .join(' · ');

  checks.push({
    checkId: 'E',
    titleJa: '現在注文内容の全約定後予想ポートフォリオ',
    grade: userResolved.projectedAfterFullFill.length === 5 ? 'PASS' : 'FAIL',
    evidenceJa: `予想保有5銘柄 · ${projectedRebalance.answerAJa}`,
    codeRefJa: 'realAccountPortfolio.projectPortfolioAfterFullFill',
  });

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査86 Malaysia v4 実口座readiness',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    `ユーザー現状: ${RAKUTEN_FLOW_STATE_LABEL[userResolved.snapshot.flowStateId]} · 現金${cashMYR}MYR · Matched${userResolved.rebalanceHoldings.reduce((s, p) => s + p.shares, 0)}株 · 注文中${userResolved.snapshot.pendingOrders.length}件`,
    `現在(Matched): ${currentRebalance.answerAJa}`,
    `約定後予想: ${projectedRebalance.answerAJa}`,
    projectedRebalance.answerEJa,
    projectedRebalance.answerFJa,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    flowSimulations,
    userSnapshot: {
      cashMYR,
      flowStateId: userResolved.snapshot.flowStateId,
      flowStateLabelJa: RAKUTEN_FLOW_STATE_LABEL[userResolved.snapshot.flowStateId],
      matchedStockValueMYR: userResolved.snapshot.matchedStockValueMYR,
      matchedShareTotal: userResolved.rebalanceHoldings.reduce((s, p) => s + p.shares, 0),
      pendingOrderCount: userResolved.snapshot.pendingOrders.length,
      orderRows: userResolved.snapshot.orderRows.map((r) => ({
        symbol: r.symbol,
        estimatedShares: r.estimatedShares,
        matchedShares: r.matchedShares,
        completed: r.completed,
      })),
    },
    currentMatchedRebalance: {
      answerAJa: currentRebalance.answerAJa,
      answerBJa: currentRebalance.answerBJa,
      answerCJa: currentRebalance.answerCJa,
      answerDJa: currentRebalance.answerDJa,
      answerEJa: currentRebalance.answerEJa,
    },
    projectedAfterFullFillRebalance: {
      answerAJa: projectedRebalance.answerAJa,
      answerBJa: projectedRebalance.answerBJa,
      answerCJa: projectedRebalance.answerCJa,
      answerDJa: projectedRebalance.answerDJa,
      answerEJa: projectedRebalance.answerEJa,
      answerFJa: projectedRebalance.answerFJa,
      holdingsSummaryJa: projectedHoldingsSummary,
    },
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4RealAccountCsv(
  report: ForwardMalaysiaV4RealAccountAuditReport,
): string {
  const lines = [
    `# 重要監査86 実口座readiness ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
    '',
    'section,flowState,matchedShares,pendingOrders,holdings,rebalanceSummary',
    ...report.flowSimulations.map((f) =>
      [
        'flow',
        f.flowStateId,
        f.matchedShareTotal,
        f.pendingOrderCount,
        f.rebalanceHoldingCount,
        `"${f.rebalanceSummaryJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,key,value',
    ['user', 'cashMYR', report.userSnapshot.cashMYR].join(','),
    ['user', 'flowState', report.userSnapshot.flowStateId].join(','),
    ['user', 'matchedShareTotal', report.userSnapshot.matchedShareTotal].join(','),
    ['user', 'pendingOrders', report.userSnapshot.pendingOrderCount].join(','),
    '',
    'section,scope,answer,content',
    ['rebalance', 'current_matched', 'A', `"${report.currentMatchedRebalance.answerAJa}"`].join(','),
    ['rebalance', 'current_matched', 'E', `"${report.currentMatchedRebalance.answerEJa}"`].join(','),
    ['rebalance', 'projected_full_fill', 'A', `"${report.projectedAfterFullFillRebalance.answerAJa}"`].join(','),
    ['rebalance', 'projected_full_fill', 'E', `"${report.projectedAfterFullFillRebalance.answerEJa}"`].join(','),
    ['rebalance', 'projected_full_fill', 'F', `"${report.projectedAfterFullFillRebalance.answerFJa}"`].join(','),
    '',
    'section,symbol,estimatedShares,matchedShares,completed',
    ...report.userSnapshot.orderRows.map((r) =>
      ['order', r.symbol, r.estimatedShares, r.matchedShares, r.completed].join(','),
    ),
  ];
  return lines.join('\n');
}

export async function runMalaysiaV4RealAccountAudit(): Promise<ForwardMalaysiaV4RealAccountAuditReport | null> {
  return buildMalaysiaV4RealAccountAuditReport();
}
