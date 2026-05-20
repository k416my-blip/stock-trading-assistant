import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
  resetExecutionJournalMemoryForTest,
} from '../../src/services/executionJournalStorage';
import { markExecutionPartiallyFilled } from '../../src/services/executionOrderService';
import type { ExecutionJournalEntry } from '../../src/types/execution';

describe('execution: partial failure', () => {
  beforeEach(() => resetExecutionJournalMemoryForTest());

  it('transitions to partially_filled', async () => {
    const now = new Date().toISOString();
    const entry: ExecutionJournalEntry = {
      orderId: 'ord_partial_1',
      idempotencyKey: 'key_partial_1',
      ledgerMode: 'practice',
      symbol: 'AAPL',
      market: 'us',
      currency: 'USD',
      side: 'buy',
      quantity: 10,
      requestedPrice: 100,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    await appendExecutionJournalEntry(entry);
    const updated = await markExecutionPartiallyFilled('ord_partial_1', 5, 99.5);
    expect(updated?.status).toBe('partially_filled');
    expect(updated?.filledQuantity).toBe(5);
    const journal = await loadExecutionJournal();
    expect(journal.entries[0].status).toBe('partially_filled');
  });
});
