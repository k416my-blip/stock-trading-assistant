import { describe, expect, it } from 'vitest';
import {
  derivePriceSyncUxCounts,
  shouldShowPriceRefreshErrorDialog,
  shouldShowPriceRefreshPartialBanner,
} from '../../src/services/priceSyncNotifications';
import { attachPriceSyncUxState } from '../../src/services/priceSyncNotifications';
import type { PriceSyncResult } from '../../src/types/marketData';

function baseResult(
  partial: Partial<PriceSyncResult>,
): PriceSyncResult {
  return attachPriceSyncUxState({
    ok: false,
    updatedCount: 0,
    failures: [],
    marketClosedHint: false,
    ...partial,
  });
}

describe('derivePriceSyncUxCounts', () => {
  it('treats live success + one hard fail as partial failure', () => {
    const ux = derivePriceSyncUxCounts(
      baseResult({
        updatedCount: 3,
        failures: [
          {
            positionId: 'p4',
            symbol: '9999',
            name: 'Fail',
            market: 'bursa',
            reason: 'offline',
          },
        ],
      }),
    );
    expect(ux).toEqual({
      successCount: 3,
      failedCount: 1,
      partialFailure: true,
      totalFailure: false,
    });
  });

  it('treats saved-price fallbacks as success (no total failure popup)', () => {
    const result = baseResult({
      updatedCount: 0,
      failures: [
        {
          positionId: 'p1',
          symbol: '5183',
          name: 'A',
          market: 'bursa',
          reason: 'offline',
          usedSavedPrice: true,
          lastSavedPrice: 7.5,
        },
        {
          positionId: 'p2',
          symbol: '1155',
          name: 'B',
          market: 'bursa',
          reason: 'offline',
          usedSavedPrice: true,
          lastSavedPrice: 9.1,
        },
        {
          positionId: 'p3',
          symbol: '1023',
          name: 'C',
          market: 'bursa',
          reason: 'offline',
          usedSavedPrice: true,
          lastSavedPrice: 4.2,
        },
        {
          positionId: 'p4',
          symbol: '9999',
          name: 'D',
          market: 'bursa',
          reason: 'offline',
        },
      ],
    });
    expect(derivePriceSyncUxCounts(result)).toMatchObject({
      successCount: 3,
      failedCount: 1,
      partialFailure: true,
      totalFailure: false,
    });
    expect(shouldShowPriceRefreshErrorDialog(result)).toBe(false);
    expect(shouldShowPriceRefreshPartialBanner(result)).toBe(true);
  });

  it('shows error dialog only when no displayable prices remain', () => {
    const result = baseResult({
      updatedCount: 0,
      failures: [
        {
          positionId: 'p1',
          symbol: '5183',
          name: 'Test',
          market: 'bursa',
          reason: 'failed',
        },
      ],
    });
    expect(derivePriceSyncUxCounts(result).totalFailure).toBe(true);
    expect(shouldShowPriceRefreshErrorDialog(result)).toBe(true);
  });

  it('does not show error dialog when all failures have saved price', () => {
    const result = baseResult({
      updatedCount: 0,
      failures: [
        {
          positionId: 'p1',
          symbol: '5183',
          name: 'Test',
          market: 'bursa',
          reason: 'offline',
          usedSavedPrice: true,
          lastSavedPrice: 7.5,
        },
      ],
    });
    expect(shouldShowPriceRefreshErrorDialog(result)).toBe(false);
    expect(shouldShowPriceRefreshPartialBanner(result)).toBe(false);
  });
});
