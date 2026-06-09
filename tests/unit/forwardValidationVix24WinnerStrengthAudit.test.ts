/**
 * npx vitest run tests/unit/forwardValidationVix24WinnerStrengthAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { analyzeTop10Traits } from '../../src/services/forwardValidation/forwardValidationVix24WinnerStrengthAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(returnPct: number): ForwardPassedTradeRecord & { vix: number } {
  return {
    id: 't',
    symbol: 'SPLG',
    signalDate: '2025-04-15',
    entryDate: '2025-04-16',
    exitDate: '2025-04-20',
    entryPrice: 60,
    exitPrice: 62,
    returnPct,
    holdDays: 4,
    exitReason: 'take_profit',
    adx14: 40,
    macdHistPct: 0.35,
    dist52wPct: -10,
    bucket: 'down',
    spyRegime: 'down',
    vix: 28,
  };
}

describe('forwardValidationVix24WinnerStrengthAudit', () => {
  it('analyzeTop10Traits returns summary', () => {
    const top10 = Array.from({ length: 10 }, (_, i) => mockTrade(3 - i * 0.1));
    const summary = analyzeTop10Traits(top10, []);
    expect(summary).toContain('上位10件');
    expect(summary).toContain('SPLG');
  });
});
