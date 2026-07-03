import { describe, expect, it } from 'vitest';
import { buildManualOrderFlowItems } from '@/services/manualOrderFlow';

describe('buildManualOrderFlowItems', () => {
  it('concierge_full creates multiple buy items from deposit', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_full',
      market: 'bursa',
      depositMYR: 5000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.side === 'buy')).toBe(true);
  });

  it('manual_full creates one item for known symbol', () => {
    const result = buildManualOrderFlowItems({
      mode: 'manual_full',
      market: 'bursa',
      symbol: '1155',
      shares: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.symbol).toBe('1155');
    expect(result.items[0]?.estimatedShares).toBe(100);
  });

  it('concierge_quantity calculates shares from amount', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_quantity',
      market: 'bursa',
      symbol: '1155',
      depositMYR: 2000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.estimatedShares).toBeGreaterThan(0);
  });

  it('concierge_symbol picks symbol from amount budget', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_symbol',
      market: 'bursa',
      depositMYR: 3000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.symbol).toBeTruthy();
  });

  it('rejects empty deposit for concierge_full', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_full',
      market: 'bursa',
      depositMYR: 0,
    });
    expect(result.ok).toBe(false);
  });
});
