import { describe, expect, it } from 'vitest';
import {
  resolveAiTrustLevelJa,
  resolveAiTrustPct,
} from '../../src/constants/beginnerAiTrustLevelJa';

describe('resolveAiTrustLevelJa', () => {
  it('maps high pct to 高い', () => {
    const r = resolveAiTrustLevelJa({ pct: 75, isEstimated: false });
    expect(r.labelJa).toBe('高い');
    expect(r.barFillRatio).toBe(1);
  });

  it('maps medium pct to 普通', () => {
    const r = resolveAiTrustLevelJa({ pct: 55, isEstimated: false });
    expect(r.labelJa).toBe('普通');
    expect(r.barFillRatio).toBe(0.66);
  });

  it('downgrades high when data quality is low', () => {
    const r = resolveAiTrustLevelJa({ pct: 80, isEstimated: false, dataQualityStars: 2 });
    expect(r.labelJa).toBe('普通');
  });

  it('adds estimated suffix', () => {
    const r = resolveAiTrustLevelJa({ pct: 30, isEstimated: true });
    expect(r.labelJa).toBe('低い（推定）');
  });
});

describe('resolveAiTrustPct', () => {
  it('prefers hybrid confidence', () => {
    expect(
      resolveAiTrustPct({ hybridConfidence: 63, finalScore: 40 }).pct,
    ).toBe(63);
  });

  it('caps pct when data quality is low', () => {
    expect(
      resolveAiTrustPct({ hybridConfidence: 80, dataQualityStars: 1 }).pct,
    ).toBe(55);
  });
});
