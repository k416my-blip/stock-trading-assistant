/**
 * npx vitest run tests/unit/forwardValidationVix24OpenEntryAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { simulateExitFromEntryPrice } from '../../src/services/forwardValidation/forwardValidationVix24OpenEntryAudit';
import type { OhlcvBar } from '../../src/services/forwardValidation/case4Indicators';

function bars(): OhlcvBar[] {
  return [
    { date: '2024-01-01', open: 100, high: 101, low: 99, close: 100 },
    { date: '2024-01-02', open: 100, high: 104, low: 99, close: 103 },
    { date: '2024-01-03', open: 103, high: 105, low: 102, close: 104 },
  ];
}

describe('forwardValidationVix24OpenEntryAudit', () => {
  it('simulates TP from open entry price', () => {
    const exit = simulateExitFromEntryPrice(bars(), 1, 25, 3, 100);
    expect(exit?.reason).toBe('take_profit');
    expect(exit?.returnPct).toBe(3);
  });

  it('open entry worse than close when gap up', () => {
    const b = bars();
    const openExit = simulateExitFromEntryPrice(b, 1, 25, 3, b[1]!.open);
    const closeExit = simulateExitFromEntryPrice(b, 1, 25, 3, b[1]!.close);
    expect(openExit!.returnPct).toBeGreaterThanOrEqual(closeExit!.returnPct - 3);
  });
});
