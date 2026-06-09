/**
 * npx vitest run tests/unit/forwardValidationRobustnessAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildRobustnessGridRow,
  buildTradesFromTemplate,
  gradeRobustness,
  ROBUSTNESS_ADX_LEVELS,
} from '../../src/services/forwardValidation/forwardValidationRobustnessAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

describe('forwardValidationRobustnessAudit', () => {
  it('builds trades filtered by adx and vix from templates', () => {
    const templates = [
      {
        id: '2020-01-02_HDV',
        signalDate: '2020-01-02',
        symbol: 'HDV',
        entryDate: '2020-01-03',
        entryPrice: 100,
        adx14: 25,
        macdHistPct: 0.2,
        dist52wPct: -3,
        bucket: 'deep' as const,
        spyRegime: 'down' as const,
        adxPass: new Set([18, 20, 22, 24]),
        vix: 26,
        exits: new Map([
          [
            '4_25',
            {
              exitDate: '2020-01-20',
              exitPrice: 104,
              returnPct: 4,
              holdDays: 10,
              exitReason: 'take_profit' as const,
            },
          ],
        ]),
      },
    ];

    const trades = buildTradesFromTemplate(templates, 20, 24, 4, 25);
    expect(trades).toHaveLength(1);
    expect(trades[0]!.returnPct).toBe(4);

    const strictVix = buildTradesFromTemplate(templates, 20, 28, 4, 25);
    expect(strictVix).toHaveLength(0);
  });

  it('grades baseline as robust when grid is tight', () => {
    const baseline = buildRobustnessGridRow(20, 24, 4, 25, [], '2018-01-01', '2026-01-01');
    baseline.tradeCount = 40;
    baseline.cumulativeReturnPct = 100;
    baseline.winRatePct = 90;
    baseline.mar = 0.8;

    const gridRows = ROBUSTNESS_ADX_LEVELS.map((adx) => {
      const row = buildRobustnessGridRow(adx, 24, 4, 25, [], '2018-01-01', '2026-01-01');
      row.tradeCount = 40;
      row.cumulativeReturnPct = adx === 20 ? 100 : 95;
      row.winRatePct = 88;
      row.mar = 0.75;
      return row;
    });

    const sensitivityRows = [
      {
        paramJa: 'ADX',
        paramKey: 'adx' as const,
        valuesTested: [18, 20, 22, 24],
        cumulativeRangePct: 5,
        cumulativeStdPct: 2,
        marRange: 0.1,
        worstDropFromBaselinePct: 5,
        rank: 1,
        fragileValuesJa: '',
        robustValuesJa: '',
      },
    ];

    const { grade } = gradeRobustness({
      baseline,
      gridRows,
      sensitivityRows,
      bestProfit: { ...baseline, cumulativeReturnPct: 102 },
    });
    expect(['A', 'B']).toContain(grade);
  });
});
