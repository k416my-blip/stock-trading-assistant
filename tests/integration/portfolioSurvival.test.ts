import { describe, expect, it } from 'vitest';
import { applyPriceRefreshTransaction } from '../../src/services/portfolioTransaction';
import { createTestAppState } from '../helpers/fixtures/appState';
import { createTestPosition } from '../helpers/fixtures/portfolio';

describe('integration: portfolio survives bad sync', () => {
  it('preserves shares when sync returns empty quotes', () => {
    const state = createTestAppState();
    const beforeShares = state.portfolio[0].shares;
    const result = applyPriceRefreshTransaction(state, 'manual', []);
    expect(result.portfolio.length).toBeGreaterThan(0);
    expect(result.portfolio[0].shares).toBe(beforeShares);
  });

  it('rolls back NaN price corruption', () => {
    const pos = createTestPosition({ currentPrice: 100 });
    const state = createTestAppState({ portfolio: [pos] });
    const corrupted = [{ ...pos, currentPrice: Number.NaN }];
    const result = applyPriceRefreshTransaction(state, 'manual', corrupted);
    expect(Number.isFinite(result.portfolio[0].currentPrice)).toBe(true);
  });
});
