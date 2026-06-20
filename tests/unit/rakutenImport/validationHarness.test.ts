import { describe, expect, it } from 'vitest';
import { buildOcrImportBatch } from '../../../src/services/rakutenImport/buildOcrImportBatch';
import { buildNaturalLanguageImportCandidate } from '../../../src/services/rakutenImport/buildNaturalLanguageImportCandidate';
import { parseNaturalLanguageTransaction } from '../../../src/services/rakutenImport/naturalLanguageTransactionParser';
import { canSaveImportCandidate } from '../../../src/services/rakutenImport/rakutenImportConfidence';
import type { OcrVisionResult } from '../../../src/services/rakutenImport/ocrVisionTypes';
import { createDefaultAppState } from '../../../src/services/storage';
import type { AppState } from '../../../src/types';

const VALIDATION_NL_PHRASES = [
  {
    phrase: '500リンギット入金した',
    type: 'deposit' as const,
    totalMYR: 500,
    saveable: true,
  },
  {
    phrase: 'MaybankをRM9.20で100株買った',
    type: 'buy' as const,
    symbol: '1155',
    quantity: 100,
    price: 9.2,
    saveable: true,
  },
  {
    phrase: 'Maybankの配当がRM50入った',
    type: 'dividend' as const,
    symbol: '1155',
    totalMYR: 50,
    saveable: true,
  },
  {
    phrase: 'RM500 withdrawal',
    type: 'withdrawal' as const,
    totalMYR: 500,
    saveable: true,
  },
];

const DUPLICATE_FIXTURE: OcrVisionResult = {
  ok: true,
  rows: [
    {
      type: 'deposit',
      date: '2026-06-15',
      total: 500,
      currency: 'MYR',
      referenceNumber: 'REF-HARNESS-1',
      confidence: 0.92,
    },
    {
      type: 'buy',
      date: '2026-06-14',
      symbol: '1155',
      quantity: 100,
      price: 9.2,
      fee: 8,
      total: 928,
      currency: 'MYR',
      confidence: 0.88,
    },
  ],
};

function asCandidate(
  r: ReturnType<typeof parseNaturalLanguageTransaction> & object,
): import('../../../src/types/rakutenImport').BrokerTransactionCandidate {
  if ('ok' in r && r.ok === false) throw new Error('parse failed');
  const nl = r as Exclude<typeof r, { ok: false }>;
  return {
    id: 'harness',
    batchId: 'batch',
    source: 'natural_language',
    type: nl.type,
    status: 'draft',
    executedAt: nl.executedAt,
    symbol: nl.symbol,
    companyName: nl.companyName,
    market: nl.market,
    currency: nl.currency,
    quantity: nl.quantity,
    price: nl.price,
    fee: nl.fee,
    totalMYR: nl.totalMYR,
    fieldConfidence: nl.fieldConfidence,
    overallConfidence: nl.overallConfidence,
    lowConfidenceFields: nl.lowConfidenceFields,
    createdAt: new Date().toISOString(),
  };
}

function commitBatchToState(
  state: AppState,
  batch: { candidates: Array<{ type: string; executedAt?: string; totalMYR?: number; symbol?: string; quantity?: number; price?: number; fee?: number; referenceNumber?: string }> },
): AppState {
  const next = structuredClone(state);
  for (const c of batch.candidates) {
    if (c.type === 'deposit' && c.totalMYR != null && c.executedAt) {
      next.deposits.push({
        id: `dep-${c.referenceNumber ?? 'h'}`,
        amountMYR: c.totalMYR,
        plannedDate: c.executedAt.slice(0, 10),
        completed: true,
        note: c.referenceNumber ? `ref:${c.referenceNumber}` : 'harness',
      });
    }
    if (c.type === 'buy' && c.symbol && c.quantity != null && c.price != null && c.executedAt) {
      next.trades.push({
        id: `trade-${c.symbol}`,
        symbol: c.symbol,
        market: 'bursa',
        currency: 'MYR',
        side: 'buy',
        shares: c.quantity,
        price: c.price,
        brokerageFee: c.fee ?? 0,
        executedAt: c.executedAt.includes('T') ? c.executedAt : `${c.executedAt}T12:00:00.000Z`,
      });
    }
  }
  return next;
}

describe('rakutenImport validation harness — NL phrases', () => {
  const state = createDefaultAppState();

  for (const spec of VALIDATION_NL_PHRASES) {
    it(spec.phrase, () => {
      const parsed = parseNaturalLanguageTransaction(spec.phrase, { state });
      expect('ok' in parsed && parsed.ok === false).toBe(false);
      if (!('type' in parsed)) return;

      expect(parsed.type).toBe(spec.type);
      if (spec.symbol) expect(parsed.symbol).toBe(spec.symbol);
      if (spec.quantity != null) expect(parsed.quantity).toBe(spec.quantity);
      if (spec.price != null) expect(parsed.price).toBe(spec.price);
      if (spec.totalMYR != null) expect(parsed.totalMYR).toBe(spec.totalMYR);

      expect(canSaveImportCandidate(asCandidate(parsed))).toBe(spec.saveable);

      const built = buildNaturalLanguageImportCandidate(spec.phrase, { state });
      expect(built.ok).toBe(true);
      if (!built.ok) return;
      expect(built.candidate.type).toBe(spec.type);
      if (spec.saveable) {
        expect(built.candidate.status).toBe('ready_to_confirm');
      }
    });
  }
});

describe('rakutenImport validation harness — duplicate OCR batch', () => {
  it('second pass blocks deposit and buy duplicates', async () => {
    const uri = 'file:///harness/dup.jpg';
    const empty = createDefaultAppState();

    const first = await buildOcrImportBatch(uri, { state: empty }, {
      visionOcr: async () => DUPLICATE_FIXTURE,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.batch.candidates.every((c) => !c.duplicateHint)).toBe(true);

    const populated = commitBatchToState(empty, first.batch);
    const second = await buildOcrImportBatch(uri, { state: populated }, {
      visionOcr: async () => DUPLICATE_FIXTURE,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const deposit = second.batch.candidates.find((c) => c.type === 'deposit');
    const buy = second.batch.candidates.find((c) => c.type === 'buy');

    expect(deposit?.duplicateHint).toBeTruthy();
    expect(deposit?.status).toBe('duplicate_blocked');
    expect(buy?.duplicateHint).toBeTruthy();
    expect(buy?.status).toBe('duplicate_blocked');
  });
});
