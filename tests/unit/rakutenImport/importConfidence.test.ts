import { describe, expect, it } from 'vitest';
import {
  canSaveImportCandidate,
  confidenceLabelJa,
  confidenceTier,
  CONFIDENCE_HIGH,
  CONFIDENCE_MIN_SAVE,
} from '../../../src/services/rakutenImport/rakutenImportConfidence';
import type { BrokerTransactionCandidate } from '../../../src/types/rakutenImport';

function baseCandidate(
  partial: Partial<BrokerTransactionCandidate>,
): BrokerTransactionCandidate {
  return {
    id: 'c1',
    batchId: 'b1',
    source: 'natural_language',
    type: 'deposit',
    status: 'draft',
    currency: 'MYR',
    fieldConfidence: {},
    overallConfidence: 1,
    lowConfidenceFields: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('rakutenImportConfidence', () => {
  it('labels tiers per design thresholds', () => {
    expect(confidenceTier(CONFIDENCE_HIGH)).toBe('high');
    expect(confidenceLabelJa(CONFIDENCE_HIGH)).toBe('高');
    expect(confidenceTier(0.7)).toBe('needs_confirmation');
    expect(confidenceLabelJa(0.7)).toBe('要確認');
    expect(confidenceTier(CONFIDENCE_MIN_SAVE - 0.01)).toBe('blocked');
    expect(confidenceLabelJa(0.5)).toBe('保存不可');
  });

  it('blocks save when overall confidence below minimum', () => {
    expect(
      canSaveImportCandidate(
        baseCandidate({
          overallConfidence: 0.55,
          totalMYR: 500,
          executedAt: '2026-06-20',
        }),
      ),
    ).toBe(false);
  });

  it('blocks save when required field is in lowConfidenceFields', () => {
    expect(
      canSaveImportCandidate(
        baseCandidate({
          type: 'buy',
          symbol: '1155',
          market: 'bursa',
          quantity: 100,
          price: 9.2,
          executedAt: '2026-06-20',
          overallConfidence: 0.9,
          lowConfidenceFields: ['price'],
          fieldConfidence: { price: 0.5 },
        }),
      ),
    ).toBe(false);
  });

  it('allows save for high-confidence deposit NL candidate', () => {
    expect(
      canSaveImportCandidate(
        baseCandidate({
          overallConfidence: 0.92,
          totalMYR: 500,
          executedAt: '2026-06-20',
          status: 'ready_to_confirm',
        }),
      ),
    ).toBe(true);
  });

  it('blocks dividend type even with high confidence', () => {
    expect(
      canSaveImportCandidate(
        baseCandidate({
          type: 'dividend',
          overallConfidence: 0.95,
          symbol: '1155',
          totalMYR: 50,
          executedAt: '2026-06-20',
        }),
      ),
    ).toBe(false);
  });

  it('blocks duplicate_blocked status', () => {
    expect(
      canSaveImportCandidate(
        baseCandidate({
          status: 'duplicate_blocked',
          totalMYR: 500,
          executedAt: '2026-06-20',
        }),
      ),
    ).toBe(false);
  });
});
