import { describe, expect, it } from 'vitest';
import { parseOcrVisionJson } from '../../../src/services/rakutenImport/ocrVisionJsonParser';

const SAMPLE_JSON = JSON.stringify({
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
});

describe('parseOcrVisionJson', () => {
  it('parses valid vision JSON rows', () => {
    const result = parseOcrVisionJson(SAMPLE_JSON);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].type).toBe('deposit');
    expect(result.rows[1].symbol).toBe('1155');
  });

  it('strips markdown code fences', () => {
    const result = parseOcrVisionJson(`\`\`\`json\n${SAMPLE_JSON}\n\`\`\``);
    expect(result.ok).toBe(true);
  });

  it('rejects empty rows', () => {
    const result = parseOcrVisionJson(JSON.stringify({ rows: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('empty_rows');
  });

  it('rejects invalid JSON', () => {
    const result = parseOcrVisionJson('not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('bad_json');
  });
});
