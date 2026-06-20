import { describe, expect, it } from 'vitest';
import {
  commitImportCandidateInState,
  previewBuyingPowerAfterImport,
} from '../../../src/services/rakutenImport/commitImportCandidate';
import { buildManualImportCandidate } from '../../../src/services/rakutenImport/buildManualImportCandidate';
import { createDefaultAppState } from '../../../src/services/storage';

describe('commitImportCandidateInState', () => {
  it('commits deposit and adds completed deposit plan', () => {
    const state = createDefaultAppState();
    const { candidate } = buildManualImportCandidate(
      {
        type: 'deposit',
        amountMYR: 2000,
        executedAt: '2026-06-20',
        referenceNumber: 'REF-1',
      },
      { state },
    );

    const result = commitImportCandidateInState(state, candidate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.deposits).toHaveLength(1);
    expect(result.state.deposits[0].amountMYR).toBe(2000);
    expect(result.state.deposits[0].completed).toBe(true);
    expect(result.journalEntry.recordSource).toBe('rakuten_import_manual');
    expect(result.candidate.status).toBe('confirmed');
    expect(result.candidate.mappedRecordIds?.depositId).toBeTruthy();
  });

  it('commits buy trade and updates portfolio', () => {
    const state = createDefaultAppState();
    const { candidate } = buildManualImportCandidate(
      {
        type: 'buy',
        symbol: '5398',
        market: 'bursa',
        currency: 'MYR',
        quantity: 100,
        price: 10,
        fee: 1,
        executedAt: '2026-06-20',
      },
      { state },
    );

    const result = commitImportCandidateInState(state, candidate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.trades).toHaveLength(1);
    expect(result.state.trades[0].side).toBe('buy');
    expect(result.state.portfolio).toHaveLength(1);
    expect(result.state.portfolio[0].symbol).toBe('5398');
    expect(result.candidate.mappedRecordIds?.tradeId).toBe(result.state.trades[0].id);
  });

  it('rejects sell when insufficient shares', () => {
    const state = createDefaultAppState();
    const { candidate } = buildManualImportCandidate(
      {
        type: 'sell',
        symbol: '5398',
        market: 'bursa',
        currency: 'MYR',
        quantity: 100,
        price: 10,
        executedAt: '2026-06-20',
      },
      { state },
    );

    const result = commitImportCandidateInState(state, candidate);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
  });

  it('blocks duplicate_blocked candidates', () => {
    const state = createDefaultAppState();
    const { candidate } = buildManualImportCandidate(
      {
        type: 'deposit',
        amountMYR: 500,
        executedAt: '2026-06-20',
      },
      { state },
    );
    const blocked = { ...candidate, status: 'duplicate_blocked' as const };

    const result = commitImportCandidateInState(state, blocked);
    expect(result.ok).toBe(false);
  });

  it('previewBuyingPowerAfterImport increases buying power after deposit', () => {
    const state = createDefaultAppState();
    const { candidate } = buildManualImportCandidate(
      {
        type: 'deposit',
        amountMYR: 1000,
        executedAt: '2026-06-20',
      },
      { state },
    );

    const preview = previewBuyingPowerAfterImport(state, candidate);
    expect(preview.afterMYR).toBeGreaterThan(preview.beforeMYR);
    expect(preview.noteJa).toContain('入金');
  });
});
