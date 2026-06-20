import { describe, expect, it, beforeEach } from 'vitest';
import { buildOcrImportBatch } from '../../../src/services/rakutenImport/buildOcrImportBatch';
import { resetRakutenImportStagingMemoryForTest } from '../../../src/services/rakutenImport/rakutenImportStagingStorage';
import type { OcrVisionResult } from '../../../src/services/rakutenImport/ocrVisionTypes';
import { createDefaultAppState } from '../../../src/services/storage';

const SAMPLE_VISION: OcrVisionResult = {
  ok: true,
  rows: [
    {
      type: 'deposit',
      date: '2026-06-15',
      total: 500,
      currency: 'MYR',
      referenceNumber: 'REF1',
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

describe('buildOcrImportBatch', () => {
  beforeEach(() => {
    resetRakutenImportStagingMemoryForTest();
  });

  it('builds batch with multiple OCR candidates', async () => {
    const result = await buildOcrImportBatch(
      'file:///mock/history.jpg',
      { state: createDefaultAppState() },
      {
        visionOcr: async () => SAMPLE_VISION,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batch.source).toBe('ocr_screenshot');
    expect(result.batch.candidates).toHaveLength(2);
    expect(result.batch.imageLocalUri).toBe('file:///mock/history.jpg');
    expect(result.batch.candidates[0].source).toBe('ocr_screenshot');
    expect(result.batch.candidates.every((c) => c.batchId === result.batch.id)).toBe(true);
  });

  it('returns error when vision OCR fails', async () => {
    const result = await buildOcrImportBatch(
      'file:///mock/history.jpg',
      { state: createDefaultAppState() },
      {
        visionOcr: async () => ({ ok: false, error: 'no key', code: 'no_api_key' }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('no key');
  });
});
