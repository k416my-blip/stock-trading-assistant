import { describe, expect, it } from 'vitest';
import { detectDuplicateImport } from '../../../src/services/rakutenImport/duplicateDetector';
import { createDefaultAppState } from '../../../src/services/storage';

describe('detectDuplicateImport', () => {
  it('blocks deposit duplicate on same day and amount', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-1',
        amountMYR: 500,
        plannedDate: '2026-06-20',
        completed: true,
        note: 'test',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'deposit',
        executedAt: '2026-06-20T10:00:00.000Z',
        totalMYR: 500,
        currency: 'MYR',
      },
      state,
    });

    expect(result.blockSave).toBe(true);
    expect(result.hint?.matchedKind).toBe('deposit');
    expect(result.hint?.matchedEntryId).toBe('dep-1');
  });

  it('blocks trade duplicate on date, symbol, quantity, and amount', () => {
    const state = createDefaultAppState();
    state.trades = [
      {
        id: 'trade-1',
        symbol: '5398',
        market: 'bursa',
        currency: 'MYR',
        side: 'buy',
        shares: 100,
        price: 10,
        brokerageFee: 0,
        executedAt: '2026-06-20T12:00:00.000Z',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'buy',
        symbol: '5398',
        market: 'bursa',
        currency: 'MYR',
        quantity: 100,
        price: 10,
        fee: 0,
        executedAt: '2026-06-20T15:00:00.000Z',
      },
      state,
    });

    expect(result.blockSave).toBe(true);
    expect(result.hint?.matchedKind).toBe('trade');
  });

  it('blocks when reference number matches deposit note', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-ref',
        amountMYR: 100,
        plannedDate: '2026-06-01',
        completed: true,
        note: 'ref:ABC123',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'deposit',
        executedAt: '2026-06-20',
        totalMYR: 200,
        currency: 'MYR',
        referenceNumber: 'ABC123',
      },
      state,
    });

    expect(result.blockSave).toBe(true);
    expect(result.hint?.matchedOn).toContain('referenceNumber');
  });

  it('returns no duplicate for unrelated candidate', () => {
    const state = createDefaultAppState();
    const result = detectDuplicateImport({
      candidate: {
        type: 'sell',
        symbol: '1023',
        market: 'bursa',
        currency: 'MYR',
        quantity: 50,
        price: 12,
        fee: 0,
        executedAt: '2026-06-20',
      },
      state,
    });

    expect(result.blockSave).toBe(false);
    expect(result.hint).toBeNull();
    expect(result.score).toBe(0);
  });
});
