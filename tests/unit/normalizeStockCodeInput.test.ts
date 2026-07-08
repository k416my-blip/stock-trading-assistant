import { describe, expect, it } from 'vitest';
import { normalizeStockCodeInput } from '@/utils/normalizeStockCodeInput';
import { buildManualOrderFlowItems } from '@/services/manualOrderFlow';

describe('normalizeStockCodeInput', () => {
  it('converts fullwidth digits to halfwidth', () => {
    expect(normalizeStockCodeInput('１１５５')).toBe('1155');
    expect(normalizeStockCodeInput('1155')).toBe('1155');
  });

  it('concierge_quantity resolves Maybank with fullwidth symbol', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_quantity',
      market: 'bursa',
      symbol: '１１５５',
      depositMYR: 5000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]?.symbol).toBe('1155');
    expect(result.budget?.remainingCashMYR ?? 0).toBeGreaterThan(0);
  });
});
