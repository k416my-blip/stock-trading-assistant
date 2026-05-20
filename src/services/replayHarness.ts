import { applyTradeToPortfolio } from './portfolio';
import { computePortfolioChecksum } from './portfolioSnapshot';
import { computeIntegrityHash } from './integrityHash';
import type { AppState, Currency, Market, TradeRecord } from '../types';

export type ReplayQuoteStep = {
  kind: 'quote';
  symbol: string;
  market: Market;
  price: number;
};

export type ReplayTradeStep = {
  kind: 'trade';
  ledgerMode: 'manual' | 'practice';
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  brokerageFee: number;
  executedAt: string;
};

export type ReplayStep = ReplayQuoteStep | ReplayTradeStep;

export type ReplayResult = {
  finalState: AppState;
  stateFingerprint: string;
  practiceChecksum: string;
  manualChecksum: string;
  tradeCount: number;
  stepsApplied: number;
};

function tradeFromStep(step: ReplayTradeStep, id: string): Omit<TradeRecord, 'id'> & { id: string } {
  return {
    id,
    symbol: step.symbol.toUpperCase(),
    market: step.market,
    currency: step.currency,
    side: step.side,
    shares: step.shares,
    price: step.price,
    brokerageFee: step.brokerageFee,
    executedAt: step.executedAt,
  };
}

/** 決定的リプレイ — 同じシーケンスなら同じフィンガープリント */
export function runDeterministicReplay(initial: AppState, steps: ReplayStep[]): ReplayResult {
  let state: AppState = JSON.parse(JSON.stringify(initial)) as AppState;
  let tradeSeq = 0;

  for (const step of steps) {
    if (step.kind === 'quote') {
      const updatePrice = (portfolio: AppState['portfolio']) =>
        portfolio.map((p) =>
          p.symbol.toUpperCase() === step.symbol.toUpperCase() && p.market === step.market
            ? {
                ...p,
                currentPrice: step.price,
                priceFetchStatus: 'ok' as const,
                isStale: false,
                lastSuccessfulFetchAt: new Date().toISOString(),
              }
            : p,
        );
      state = {
        ...state,
        portfolio: updatePrice(state.portfolio),
        practice: {
          ...state.practice,
          portfolio: updatePrice(state.practice.portfolio),
        },
      };
      continue;
    }

    tradeSeq += 1;
    const trade = tradeFromStep(step, `replay_${tradeSeq}`);
    if (step.ledgerMode === 'practice') {
      const portfolio = applyTradeToPortfolio(state.practice.portfolio, trade);
      state = {
        ...state,
        practice: {
          ...state.practice,
          portfolio,
          trades: [trade, ...state.practice.trades],
        },
      };
    } else {
      const portfolio = applyTradeToPortfolio(state.portfolio, trade);
      state = {
        ...state,
        portfolio,
        trades: [trade, ...state.trades],
      };
    }
  }

  const manualChecksum = computePortfolioChecksum(state.portfolio);
  const practiceChecksum = computePortfolioChecksum(state.practice.portfolio);
  const stateFingerprint = computeIntegrityHash({
    manual: manualChecksum,
    practice: practiceChecksum,
    tradeCount: state.trades.length + state.practice.trades.length,
  });

  return {
    finalState: state,
    stateFingerprint,
    practiceChecksum,
    manualChecksum,
    tradeCount: state.trades.length + state.practice.trades.length,
    stepsApplied: steps.length,
  };
}

export function assertReplayDeterminism(
  initial: AppState,
  steps: ReplayStep[],
  expectedFingerprint: string,
): boolean {
  const a = runDeterministicReplay(initial, steps);
  const b = runDeterministicReplay(initial, steps);
  return a.stateFingerprint === b.stateFingerprint && a.stateFingerprint === expectedFingerprint;
}
