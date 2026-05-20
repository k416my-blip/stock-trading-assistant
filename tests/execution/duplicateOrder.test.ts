import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildIdempotencyKey,
  findDuplicateIdempotencyEntry,
} from '../../src/services/executionIdempotency';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
  resetExecutionJournalMemoryForTest,
} from '../../src/services/executionJournalStorage';
import type { ExecutionJournalEntry } from '../../src/types/execution';

describe('execution: duplicate order spam', () => {
  beforeEach(() => resetExecutionJournalMemoryForTest());

  it('detects duplicate idempotency keys', async () => {
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
      orderId: 'ord_dup_1',
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
    expect(findDuplicateIdempotencyEntry(journal.entries, key)).not.toBeNull();
  });
});
