/**
 * 執行安全検証（npx tsx src/verify/executionSafety.verify.ts）
 */
import { createDefaultAppState } from '../services/storage';
import { buildIdempotencyKey, hasPendingOrderLock, findDuplicateIdempotencyEntry } from '../services/executionIdempotency';
import { assessExecutionMarketData } from '../services/executionSafetyGate';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
  resetExecutionJournalMemoryForTest,
} from '../services/executionJournalStorage';
import { markExecutionPartiallyFilled } from '../services/executionOrderService';
import { reconcileExecutionJournal } from '../services/executionReconciliationService';
import type { ExecutionJournalEntry } from '../types/execution';
import type { PortfolioPosition } from '../types';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}`);
  }
}

function stalePosition(): PortfolioPosition {
  const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  return {
    id: 'us-aapl',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    shares: 10,
    averageBuyPrice: 100,
    currentPrice: 100,
    priceSource: 'api',
    priceFetchStatus: 'failed',
    isStale: true,
    lastSuccessfulFetchAt: old,
    openedAt: old,
  };
}

async function main() {
  resetExecutionJournalMemoryForTest();

  const request = {
    ledgerMode: 'practice' as const,
    market: 'us' as const,
    symbol: 'AAPL',
    side: 'buy' as const,
    quantity: 10,
  };
  const key = buildIdempotencyKey(request);
  const now = new Date().toISOString();

  const entry: ExecutionJournalEntry = {
    orderId: 'ord_test_1',
    idempotencyKey: key,
    ledgerMode: 'practice',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    side: 'buy',
    quantity: 10,
    requestedPrice: 100,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await appendExecutionJournalEntry(entry);

  const journal = await loadExecutionJournal();
  assert('journal persists entry', journal.entries.some((e) => e.orderId === 'ord_test_1'));
  assert('duplicate idempotency detected', findDuplicateIdempotencyEntry(journal.entries, key) != null);
  assert(
    'pending lock active',
    hasPendingOrderLock(journal.entries, {
      ledgerMode: 'practice',
      market: 'us',
      symbol: 'AAPL',
      side: 'buy',
    }),
  );

  const stale = assessExecutionMarketData(100, stalePosition());
  assert('stale execution blocked', stale.allowed === false && stale.blockedByStale === true);

  const noPrice = assessExecutionMarketData(0, undefined);
  assert('unavailable quote blocked', noPrice.allowed === false && noPrice.quoteUnavailable === true);

  const partial = await markExecutionPartiallyFilled('ord_test_1', 5, 99.5);
  assert('partial fill state', partial?.status === 'partially_filled' && partial.filledQuantity === 5);

  const state = createDefaultAppState();
  state.practice.portfolio = [
    {
      id: 'us-aapl',
      symbol: 'AAPL',
      market: 'us',
      currency: 'USD',
      shares: 99,
      averageBuyPrice: 100,
      currentPrice: 100,
      openedAt: now,
    },
  ];
  await appendExecutionJournalEntry({
    ...entry,
    orderId: 'ord_confirmed',
    status: 'confirmed',
    quantity: 10,
    filledQuantity: 10,
    executedPrice: 100,
  });

  const report = await reconcileExecutionJournal(state);
  assert('reconciliation detects mismatch', report.mismatchCount > 0);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
