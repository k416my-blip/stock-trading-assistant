/**
 * npx vitest run tests/unit/forwardValidationQqqNecessityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  dedupOneEtfPerDayWithQqqReplacement,
  dedupForQqqScenario,
  QQQ_NECESSITY_SCENARIOS,
} from '../../src/services/forwardValidation/forwardValidationQqqNecessityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  symbol: string,
  signal: string,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate: signal,
    entryDate: signal,
    exitDate: '2020-01-15',
    entryPrice: 100,
    exitPrice: 104,
    returnPct: 4,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'up',
    spyRegime: 'up',
  };
}

describe('forwardValidationQqqNecessityAudit', () => {
  it('defines 6 QQQ comparison scenarios', () => {
    expect(QQQ_NECESSITY_SCENARIOS.length).toBe(6);
    expect(QQQ_NECESSITY_SCENARIOS.map((s) => s.scenarioId)).toContain('excl_qqq');
  });

  it('replaces QQQ pick with SCHD when both signal same day', () => {
    const candidates = [
      trade('a', 'QQQ', '2020-01-02'),
      trade('b', 'SCHD', '2020-01-02'),
      trade('c', 'HDV', '2020-01-03'),
    ];
    const out = dedupOneEtfPerDayWithQqqReplacement(
      candidates,
      ['HDV', 'DGRO', 'SCHD', 'QQQ'],
      'SCHD',
      [],
    );
    const day1 = out.find((t) => t.signalDate === '2020-01-02');
    expect(day1?.symbol).not.toBe('QQQ');
  });

  it('excludes QQQ in excl scenario dedup', () => {
    const candidates = [
      trade('a', 'QQQ', '2020-01-02'),
      trade('b', 'HDV', '2020-01-02'),
    ];
    const def = QQQ_NECESSITY_SCENARIOS.find((s) => s.scenarioId === 'excl_qqq')!;
    const out = dedupForQqqScenario(candidates, def);
    expect(out.every((t) => t.symbol !== 'QQQ')).toBe(true);
  });
});
