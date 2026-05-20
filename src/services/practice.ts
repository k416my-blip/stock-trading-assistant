import { DEFAULT_VIRTUAL_CAPITAL_MYR } from '../constants/practice';
import type {
  PracticeState,
  PracticeStats,
  PortfolioPosition,
  TradeRecord,
} from '../types';
import { toMYR } from './fx';
import { computePositionPnL } from './positionValuation';
import { applyTradeToPortfolio, appendPerformanceSnapshot } from './portfolio';
import { safePrice, safeShares } from '../utils/safeNumeric';

export function createDefaultPracticeState(): PracticeState {
  return {
    virtualCapitalMYR: DEFAULT_VIRTUAL_CAPITAL_MYR,
    cashBalanceMYR: DEFAULT_VIRTUAL_CAPITAL_MYR,
    portfolio: [],
    trades: [],
    performanceHistory: [],
  };
}

function tradeCostMYR(trade: Pick<TradeRecord, 'shares' | 'price' | 'currency' | 'brokerageFee'>): number {
  return toMYR(trade.shares * trade.price, trade.currency) + toMYR(trade.brokerageFee, trade.currency);
}

function calcHoldingsValueMYR(portfolio: PortfolioPosition[]): number {
  return portfolio.reduce((sum, p) => {
    const shares = safeShares(p.shares, 0);
    const price = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    return sum + toMYR(price * shares, p.currency);
  }, 0);
}

function positionsUnrealizedMYR(portfolio: PortfolioPosition[]): number {
  return portfolio.reduce((sum, p) => {
    const pnl = computePositionPnL(p).unrealizedProfitLoss;
    return sum + toMYR(pnl, p.currency);
  }, 0);
}

export function calculatePracticeStats(practice: PracticeState): PracticeStats {
  const holdingsValueMYR = calcHoldingsValueMYR(practice.portfolio);
  const portfolioValueMYR = practice.cashBalanceMYR + holdingsValueMYR;
  const unrealizedPnLMYR = positionsUnrealizedMYR(practice.portfolio);
  const sells = practice.trades.filter((t) => t.side === 'sell');
  const realizedPnLMYR = sells.reduce((s, t) => s + (t.realizedPnLMYR ?? 0), 0);
  const winCount = sells.filter((t) => (t.realizedPnLMYR ?? 0) > 0).length;
  const lossCount = sells.filter((t) => (t.realizedPnLMYR ?? 0) < 0).length;
  const closed = winCount + lossCount;
  const winRatePct = closed > 0 ? (winCount / closed) * 100 : 0;
  const totalReturnPct =
    practice.virtualCapitalMYR > 0
      ? ((portfolioValueMYR - practice.virtualCapitalMYR) / practice.virtualCapitalMYR) * 100
      : 0;

  return {
    virtualCapitalMYR: practice.virtualCapitalMYR,
    cashBalanceMYR: practice.cashBalanceMYR,
    holdingsValueMYR,
    portfolioValueMYR,
    unrealizedPnLMYR,
    realizedPnLMYR,
    winRatePct,
    winCount,
    lossCount,
    totalReturnPct,
  };
}

export type PracticeTradeResult =
  | { ok: true; practice: PracticeState }
  | { ok: false; error: string };

export function executePracticeTrade(
  practice: PracticeState,
  trade: Omit<TradeRecord, 'id'>,
): PracticeTradeResult {
  const costMYR = tradeCostMYR(trade);
  let cashBalanceMYR = practice.cashBalanceMYR;
  let portfolio = [...practice.portfolio];
  let realizedPnLMYR: number | undefined;

  if (trade.shares <= 0) {
    return { ok: false, error: '株数は1以上にしてください。' };
  }

  if (trade.side === 'buy') {
    if (costMYR > cashBalanceMYR) {
      return { ok: false, error: '現金残高が不足しています。仮想入金するか、株数を減らしてください。' };
    }
    cashBalanceMYR -= costMYR;
    portfolio = applyTradeToPortfolio(portfolio, { ...trade, id: 'tmp' });
  } else {
    const existing = portfolio.find((p) => p.symbol === trade.symbol && p.market === trade.market);
    if (!existing || existing.shares < trade.shares) {
      return { ok: false, error: '保有株数が不足しています。' };
    }
    const proceedsMYR = toMYR(trade.shares * trade.price, trade.currency) - toMYR(trade.brokerageFee, trade.currency);
    realizedPnLMYR =
      toMYR((trade.price - existing.averageBuyPrice) * trade.shares, trade.currency) -
      toMYR(trade.brokerageFee, trade.currency);
    cashBalanceMYR += proceedsMYR;
    portfolio = applyTradeToPortfolio(portfolio, { ...trade, id: 'tmp' });
  }

  const record: TradeRecord = {
    ...trade,
    id: `${trade.executedAt}-${trade.symbol}-${trade.side}`,
    realizedPnLMYR,
  };

  const trades = [record, ...practice.trades];
  const portfolioValueMYR = cashBalanceMYR + calcHoldingsValueMYR(portfolio);
  const today = new Date().toISOString().slice(0, 10);
  const performanceHistory = appendPerformanceSnapshot(practice.performanceHistory, today, portfolioValueMYR);

  const nextPractice: PracticeState = {
    ...practice,
    cashBalanceMYR,
    portfolio: portfolio.filter((p) => p.shares > 0),
    trades,
    performanceHistory,
  };

  return {
    ok: true,
    practice: nextPractice,
  };
}

export function setVirtualCapital(practice: PracticeState, amountMYR: number): PracticeState {
  const diff = amountMYR - practice.virtualCapitalMYR;
  return {
    ...practice,
    virtualCapitalMYR: amountMYR,
    cashBalanceMYR: Math.max(0, practice.cashBalanceMYR + diff),
  };
}

export function addVirtualDeposit(practice: PracticeState, amountMYR: number): PracticeState {
  return {
    ...practice,
    cashBalanceMYR: practice.cashBalanceMYR + amountMYR,
  };
}

export function resetPractice(): PracticeState {
  return createDefaultPracticeState();
}
