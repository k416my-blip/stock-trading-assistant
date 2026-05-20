import type { ReplayStep } from '../../../src/services/replayHarness';

/** 決定的リグレッション用シーケンス */
export const BASELINE_REPLAY_SEQUENCE: ReplayStep[] = [
  { kind: 'quote', symbol: 'AAPL', market: 'us', price: 100 },
  {
    kind: 'trade',
    ledgerMode: 'practice',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    side: 'buy',
    shares: 5,
    price: 100,
    brokerageFee: 0,
    executedAt: '2026-01-15T10:00:00.000Z',
  },
  { kind: 'quote', symbol: 'AAPL', market: 'us', price: 110 },
  {
    kind: 'trade',
    ledgerMode: 'practice',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    side: 'buy',
    shares: 5,
    price: 110,
    brokerageFee: 0,
    executedAt: '2026-01-15T11:00:00.000Z',
  },
];

export const DUPLICATE_ORDER_SPAM: ReplayStep[] = [
  ...BASELINE_REPLAY_SEQUENCE.slice(0, 2),
  ...BASELINE_REPLAY_SEQUENCE.slice(1, 2),
  ...BASELINE_REPLAY_SEQUENCE.slice(1, 2),
];
