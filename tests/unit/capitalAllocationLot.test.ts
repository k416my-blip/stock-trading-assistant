import { describe, expect, it } from 'vitest';
import { roundToLotSize, validateLotForMarket } from '../../src/services/capitalAllocationLot';

describe('capitalAllocationLot', () => {
  it('rounds Bursa to 100-share lots', () => {
    const r = roundToLotSize(150, 'bursa');
    expect(r.shares).toBe(100);
    expect(validateLotForMarket(100, 'bursa').valid).toBe(true);
  });

  it('allows US fractional down to 1 share', () => {
    const r = roundToLotSize(2.7, 'us');
    expect(r.shares).toBe(2);
    expect(validateLotForMarket(2, 'us').valid).toBe(true);
  });

  it('rejects HK below min lot', () => {
    const r = roundToLotSize(50, 'hk');
    expect(r.shares).toBe(0);
  });
});
