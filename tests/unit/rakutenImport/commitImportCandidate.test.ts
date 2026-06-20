import { describe, expect, it } from 'vitest';
import {
  commitImportCandidateInState,
  previewBuyingPowerAfterImport,
} from '../../../src/services/rakutenImport/commitImportCandidate';
import { buildManualImportCandidate } from '../../../src/services/rakutenImport/buildManualImportCandidate';
import { buildNaturalLanguageImportCandidate } from '../../../src/services/rakutenImport/buildNaturalLanguageImportCandidate';
import { calculateBuyingPower } from '../../../src/services/buyingPower';
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

  it('commits dividend record', () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('Maybankの配当がRM50入った', { state });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const result = commitImportCandidateInState(state, {
      ...built.candidate,
      status: 'ready_to_confirm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.dividends).toHaveLength(1);
    expect(result.state.dividends[0].symbol).toBe('1155');
    expect(result.state.dividends[0].amount).toBe(50);
    expect(result.candidate.mappedRecordIds?.dividendId).toBeTruthy();
    expect(result.journalEntry.recordSource).toBe('rakuten_import_nl');
  });

  it('commits withdrawal and reduces buying power', () => {
    const state = {
      ...createDefaultAppState(),
      settings: { ...createDefaultAppState().settings, totalCapitalMYR: 5000 },
    };
    const built = buildNaturalLanguageImportCandidate('RM500 withdrawal', { state });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const before = calculateBuyingPower(state).buyingPowerMYR;
    const result = commitImportCandidateInState(state, {
      ...built.candidate,
      status: 'ready_to_confirm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.withdrawals).toHaveLength(1);
    expect(result.state.withdrawals![0].amountMYR).toBe(500);
    expect(result.candidate.mappedRecordIds?.withdrawalId).toBeTruthy();
    const after = calculateBuyingPower(result.state).buyingPowerMYR;
    expect(after).toBe(before - 500);
  });

  it('commits standalone fee as feeAdjustment record', () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('手数料RM8', { state });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const result = commitImportCandidateInState(state, {
      ...built.candidate,
      status: 'ready_to_confirm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.feeAdjustments).toHaveLength(1);
    expect(result.state.feeAdjustments![0].amountMYR).toBe(8);
    expect(result.candidate.mappedRecordIds?.feeAdjustmentId).toBeTruthy();
  });

  it('merges fee onto same-day same-symbol trade', () => {
    const state = createDefaultAppState();
    const { candidate: buyCandidate } = buildManualImportCandidate(
      {
        type: 'buy',
        symbol: '1155',
        market: 'bursa',
        currency: 'MYR',
        quantity: 100,
        price: 9,
        fee: 0,
        executedAt: '2026-06-20',
      },
      { state },
    );
    const buyResult = commitImportCandidateInState(state, buyCandidate);
    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) return;

    const built = buildNaturalLanguageImportCandidate('手数料RM8', {
      state: buyResult.state,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const feeCandidate = {
      ...built.candidate,
      symbol: '1155',
      executedAt: '2026-06-20',
      status: 'ready_to_confirm' as const,
    };
    const feeResult = commitImportCandidateInState(buyResult.state, feeCandidate);
    expect(feeResult.ok).toBe(true);
    if (!feeResult.ok) return;

    expect(feeResult.state.trades[0].brokerageFee).toBe(8);
    expect(feeResult.candidate.mappedRecordIds?.tradeId).toBe(feeResult.state.trades[0].id);
    expect(feeResult.state.feeAdjustments ?? []).toHaveLength(0);
  });
});
