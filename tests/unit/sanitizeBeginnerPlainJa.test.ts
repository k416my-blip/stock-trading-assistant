import { describe, expect, it } from 'vitest';
import {
  BEGINNER_REASON_FALLBACKS,
  fillBeginnerReasons,
  fillBeginnerWatchpoints,
  sanitizeBeginnerPlainJa,
} from '../../src/services/beginner/sanitizeBeginnerPlainJa';

describe('sanitizeBeginnerPlainJa', () => {
  it('replaces investment jargon with plain Japanese', () => {
    const out = sanitizeBeginnerPlainJa('配当は安定しており、決算も良好です');
    expect(out).toContain('お金の還元');
    expect(out).toContain('会社の成績');
    expect(out).not.toContain('配当');
    expect(out).not.toContain('決算');
  });

  it('truncates to 48 chars and adds period', () => {
    const long = 'あ'.repeat(60);
    const out = sanitizeBeginnerPlainJa(long);
    expect(out.length).toBeLessThanOrEqual(49);
    expect(out.endsWith('。')).toBe(true);
  });

  it('strips forbidden advisory patterns', () => {
    const out = sanitizeBeginnerPlainJa('必ず買うべき銘柄です');
    expect(out).not.toContain('必ず');
    expect(out).not.toContain('すべき');
  });
});

describe('fillBeginnerReasons', () => {
  it('always returns exactly 3 non-empty lines', () => {
    const reasons = fillBeginnerReasons([]);
    expect(reasons).toHaveLength(3);
    for (const line of reasons) {
      expect(line.length).toBeGreaterThan(0);
    }
    expect(reasons[0]).toBe(BEGINNER_REASON_FALLBACKS[0] + '。');
  });

  it('deduplicates and fills from fallbacks', () => {
    const reasons = fillBeginnerReasons(['配当安定', '配当安定']);
    expect(reasons).toHaveLength(3);
    expect(new Set(reasons).size).toBe(3);
  });
});

describe('fillBeginnerWatchpoints', () => {
  it('never returns empty array', () => {
    const points = fillBeginnerWatchpoints([]);
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(3);
  });

  it('respects max count', () => {
    const points = fillBeginnerWatchpoints(
      ['a', 'b', 'c', 'd', 'e'].map((x) => `${x}の注意点`),
      3,
    );
    expect(points).toHaveLength(3);
  });
});
