import { describe, expect, it } from 'vitest';
import {
  gradeKellyTriggerAdoption,
  isKellyTriggerForPreset,
  KELLY_TRIGGER_PRESETS,
  pickOptimalKellyPreset,
} from '../../src/services/forwardValidation/forwardValidationKellyTriggerAudit';
import type { ForwardKellyTriggerPresetMetrics } from '../../types/forwardValidation';

function presetRow(
  presetId: ForwardKellyTriggerPresetMetrics['presetId'],
  overrides: Partial<ForwardKellyTriggerPresetMetrics> = {},
): ForwardKellyTriggerPresetMetrics {
  const def = KELLY_TRIGGER_PRESETS.find((p) => p.presetId === presetId)!;
  return {
    presetId,
    labelJa: def.labelJa,
    conditionJa: def.conditionJa,
    vixMin: def.thresholds.vixMin,
    qqqMa200ThresholdPct: def.thresholds.qqqMa200MaxPct,
    ndx52wThresholdPct: def.thresholds.ndx52wMaxPct,
    tradeCount: 48,
    kellyTriggerCount: 12,
    kellyTriggerRatePct: 25,
    cumulativeReturnPct: 30,
    maxDrawdownPct: -3.5,
    sharpe: 2.1,
    profitFactor: 5.2,
    bankruptcyRatePct: 0,
    minEquityPct: 100,
    finalEquityMYR: 3900,
    avgSlotMYR: 650,
    deltaCumulativeVsRm700Pt: 0.5,
    deltaMaxDDVsRm700Pt: 0.8,
    deltaSharpeVsRm700: 0.05,
    inTargetTriggerBand: true,
    ...overrides,
  };
}

describe('forwardValidationKellyTriggerAudit', () => {
  it('isKellyTriggerForPreset uses <= thresholds', () => {
    const t = KELLY_TRIGGER_PRESETS[0]!.thresholds;
    expect(isKellyTriggerForPreset({ vixAtSignal: 30 } as never, t)).toBe(true);
    expect(isKellyTriggerForPreset({ qqqMa200DevPct: -10 } as never, t)).toBe(true);
    expect(isKellyTriggerForPreset({ ndxDist52Pct: -15 } as never, t)).toBe(true);
    expect(isKellyTriggerForPreset({ vixAtSignal: 25 } as never, t)).toBe(false);
  });

  it('pickOptimalKellyPreset prefers in-band preset', () => {
    const rows = [
      presetRow('current', { kellyTriggerRatePct: 73, inTargetTriggerBand: false }),
      presetRow('strict', { kellyTriggerRatePct: 31, inTargetTriggerBand: true, deltaMaxDDVsRm700Pt: 1.2 }),
    ];
    expect(pickOptimalKellyPreset(rows)?.presetId).toBe('strict');
  });

  it('gradeKellyTriggerAdoption returns A for strong in-band preset', () => {
    const optimal = presetRow('strict', {
      kellyTriggerRatePct: 30,
      inTargetTriggerBand: true,
      deltaMaxDDVsRm700Pt: 1.5,
      deltaCumulativeVsRm700Pt: 0,
    });
    const { grade } = gradeKellyTriggerAdoption({
      optimal,
      rm700: {
        tradeCount: 48,
        cumulativeReturnPct: 29.9,
        maxDrawdownPct: -4.3,
        sharpe: 2.14,
        profitFactor: 5.26,
        bankruptcyRatePct: 0,
        finalEquityMYR: 3898,
      },
    });
    expect(grade).toBe('A');
  });

  it('KELLY_TRIGGER_PRESETS has three presets', () => {
    expect(KELLY_TRIGGER_PRESETS).toHaveLength(3);
  });
});
