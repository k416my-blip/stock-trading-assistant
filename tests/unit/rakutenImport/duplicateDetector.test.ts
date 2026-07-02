import { describe, expect, it } from 'vitest';
import { detectDuplicateImport } from '../../../src/services/rakutenImport/duplicateDetector';
import { createDefaultAppState } from '../../../src/services/storage';

describe('detectDuplicateImport', () => {
  it('warns but does not block deposit on same day and amount without matching reference', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-1',
        amountMYR: 500,
        plannedDate: '2026-06-20',
        completed: true,
        note: 'Rakuten import (manual) · ref:ABC123',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'deposit',
        executedAt: '2026-06-20T10:00:00.000Z',
        totalMYR: 500,
        currency: 'MYR',
        referenceNumber: 'XYZ999',
      },
      state,
    });

    expect(result.blockSave).toBe(false);
    expect(result.hint?.matchedKind).toBe('deposit');
    expect(result.hint?.matchedOn).toEqual(['date', 'amount']);
  });

  it('blocks deposit on exact date + amount + reference match', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-1',
        amountMYR: 500,
        plannedDate: '2026-06-20',
        completed: true,
        note: 'Rakuten import (manual) · ref:ABC123',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'deposit',
        executedAt: '2026-06-20T10:00:00.000Z',
        totalMYR: 500,
        currency: 'MYR',
        referenceNumber: 'ABC123',
      },
      state,
    });

    expect(result.blockSave).toBe(true);
    expect(result.hint?.matchedKind).toBe('deposit');
    expect(result.hint?.matchedOn).toEqual(['date', 'amount', 'referenceNumber']);
  });

  it('blocks deposit on exact date + amount when both references are empty', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-1',
        amountMYR: 500,
        plannedDate: '2026-06-20',
        completed: true,
        note: 'Rakuten import (manual)',
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
    expect(result.hint?.matchedOn).toEqual(['date', 'amount', 'referenceNumber']);
  });

  it('warns when same date and amount but candidate has reference and existing does not', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'dep-1',
        amountMYR: 5000,
        plannedDate: '2026-07-02',
        completed: true,
        note: 'Rakuten import (manual)',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'deposit',
        executedAt: '2026-07-02',
        totalMYR: 5000,
        currency: 'MYR',
        referenceNumber: 'REF-NEW',
      },
      state,
    });

    expect(result.blockSave).toBe(false);
    expect(result.hint?.matchedOn).toEqual(['date', 'amount']);
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

  it('blocks withdrawal on exact date + amount + reference', () => {
    const state = createDefaultAppState();
    state.withdrawals = [
      {
        id: 'wdr-1',
        amountMYR: 200,
        withdrawnAt: '2026-06-20',
        referenceNumber: 'WDR-1',
        source: 'manual_form',
      },
    ];

    const result = detectDuplicateImport({
      candidate: {
        type: 'withdrawal',
        executedAt: '2026-06-20',
        totalMYR: 200,
        currency: 'MYR',
        referenceNumber: 'WDR-1',
      },
      state,
    });

    expect(result.blockSave).toBe(true);
    expect(result.hint?.matchedOn).toEqual(['date', 'amount', 'referenceNumber']);
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
