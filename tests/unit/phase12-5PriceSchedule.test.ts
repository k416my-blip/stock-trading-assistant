import { describe, expect, it } from 'vitest';
import {
  advancePriceSlot,
  initialPriceSlot,
  isPriceRefreshDue,
  legacyMinuteIndexFromElapsed,
  priceRefreshTag,
} from '../../scripts/lib/phase12-5-price-schedule.mjs';

describe('phase12-5 price schedule', () => {
  it('advancePriceSlot walks 0/15/30/45 then next hour', () => {
    expect(advancePriceSlot(1, 30)).toEqual({ hourIndex: 1, minuteIndex: 45 });
    expect(advancePriceSlot(1, 45)).toEqual({ hourIndex: 2, minuteIndex: 0 });
  });

  it('isPriceRefreshDue respects 15-minute gate', () => {
    expect(isPriceRefreshDue(1_000_000, 0, 900_000)).toBe(true);
    expect(isPriceRefreshDue(500_000, 0, 900_000)).toBe(false);
  });

  it('scheduled slot after h1-m30 is h1-m45 even when elapsed hourIndex is already 2', () => {
    let next = initialPriceSlot();
    const walked = [];
    for (let i = 0; i < 7; i += 1) {
      walked.push(priceRefreshTag(next.hourIndex, next.minuteIndex));
      next = advancePriceSlot(next.hourIndex, next.minuteIndex);
    }
    expect(walked).toEqual(['h0-m0', 'h0-m15', 'h0-m30', 'h0-m45', 'h1-m0', 'h1-m15', 'h1-m30']);
    expect(priceRefreshTag(next.hourIndex, next.minuteIndex)).toBe('h1-m45');

    const elapsedAfterBoundary = 2 * 3600_000 + 180_000;
    const staleHourIndex = Math.floor(elapsedAfterBoundary / 3600_000);
    expect(staleHourIndex).toBe(2);
    expect(priceRefreshTag(staleHourIndex, legacyMinuteIndexFromElapsed(elapsedAfterBoundary, 3600_000))).toBe(
      'h2-m0',
    );
  });

  it('legacyMinuteIndexFromElapsed maps post-boundary elapsed to h2-m0', () => {
    const elapsed = 2 * 3600_000 + 3 * 60_000;
    expect(legacyMinuteIndexFromElapsed(elapsed, 3600_000)).toBe(0);
    expect(priceRefreshTag(2, legacyMinuteIndexFromElapsed(elapsed, 3600_000))).toBe('h2-m0');
  });

  it('initial slot is h0-m0', () => {
    expect(initialPriceSlot()).toEqual({ hourIndex: 0, minuteIndex: 0 });
    expect(priceRefreshTag(0, 0)).toBe('h0-m0');
  });
});
