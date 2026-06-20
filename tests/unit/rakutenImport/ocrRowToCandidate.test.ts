import { describe, expect, it } from 'vitest';
import { ocrRowToCandidateFields, normalizeOcrDate } from '../../../src/services/rakutenImport/ocrRowToCandidate';
import { canSaveImportCandidate } from '../../../src/services/rakutenImport/rakutenImportConfidence';
import type { OcrTransactionRow } from '../../../src/types/rakutenImport';

const IDS = { candidateId: 'c-ocr-1', batchId: 'b-ocr-1', imageLocalUri: 'file:///tmp/history.jpg' };

function row(partial: OcrTransactionRow): OcrTransactionRow {
  return partial;
}

describe('normalizeOcrDate', () => {
  it('parses ISO and DD/MM/YYYY', () => {
    expect(normalizeOcrDate('2026-06-15')).toBe('2026-06-15');
    expect(normalizeOcrDate('15/06/2026')).toBe('2026-06-15');
  });
});

describe('ocrRowToCandidateFields', () => {
  it('maps deposit row', () => {
    const c = ocrRowToCandidateFields(
      row({
        type: 'deposit',
        date: '2026-06-15',
        total: 500,
        currency: 'MYR',
        referenceNumber: 'REF1',
        confidence: 0.92,
      }),
      IDS,
    );
    expect(c?.type).toBe('deposit');
    expect(c?.totalMYR).toBe(500);
    expect(c?.source).toBe('ocr_screenshot');
    expect(c?.overallConfidence).toBe(0.92);
    expect(canSaveImportCandidate({ ...c!, status: 'ready_to_confirm' })).toBe(true);
  });

  it('maps buy row with Maybank symbol resolution', () => {
    const c = ocrRowToCandidateFields(
      row({
        type: 'buy',
        date: '2026-06-14',
        symbol: '1155',
        quantity: 100,
        price: 9.2,
        fee: 8,
        total: 928,
        currency: 'MYR',
        confidence: 0.88,
      }),
      IDS,
    );
    expect(c?.symbol).toBe('1155');
    expect(c?.companyName).toBe('Malayan Banking');
    expect(c?.quantity).toBe(100);
    expect(canSaveImportCandidate({ ...c!, status: 'ready_to_confirm' })).toBe(true);
  });

  it('maps all six transaction types', () => {
    const types = ['deposit', 'withdrawal', 'buy', 'sell', 'dividend', 'fee'] as const;
    for (const type of types) {
      const base: OcrTransactionRow = {
        type,
        date: '2026-06-10',
        confidence: 0.85,
        currency: 'MYR',
      };
      if (type === 'buy' || type === 'sell') {
        base.symbol = '1155';
        base.quantity = 10;
        base.price = 9;
      }
      if (type === 'dividend') {
        base.symbol = '1155';
        base.total = 50;
      }
      if (type === 'deposit' || type === 'withdrawal') {
        base.total = 100;
      }
      if (type === 'fee') {
        base.fee = 8;
      }
      const c = ocrRowToCandidateFields(base, IDS);
      expect(c?.type).toBe(type);
      expect(c?.source).toBe('ocr_screenshot');
    }
  });

  it('resolves company name to Bursa symbol', () => {
    const c = ocrRowToCandidateFields(
      row({
        type: 'sell',
        date: '2026-06-12',
        company: 'Maybank',
        quantity: 50,
        price: 9.5,
        confidence: 0.8,
      }),
      IDS,
    );
    expect(c?.symbol).toBe('1155');
    expect(c?.companyName).toBe('Malayan Banking');
  });

  it('returns null for unknown type string', () => {
    const c = ocrRowToCandidateFields(
      { type: 'transfer' as 'deposit', date: '2026-06-12', total: 100 },
      IDS,
    );
    expect(c).toBeNull();
  });
});
