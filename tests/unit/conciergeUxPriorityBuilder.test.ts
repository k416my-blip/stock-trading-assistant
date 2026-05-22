import { describe, expect, it } from 'vitest';
import {
  buildConciergeUxBundle,
  buildStubConciergeUxBundle,
} from '../../src/services/conciergeUxPriorityBuilder';
import { NOTIFICATION_DIGEST_MIN_COUNT } from '../../src/constants/conciergeUx';

describe('conciergeUxPriorityBuilder', () => {
  it('builds three-line summary', () => {
    const bundle = buildStubConciergeUxBundle('beginner');
    expect(bundle.summary.situationLineJa.length).toBeGreaterThan(0);
    expect(bundle.summary.dangerLineJa.length).toBeGreaterThan(0);
    expect(bundle.summary.judgmentLineJa.length).toBeGreaterThan(0);
    expect(['green', 'yellow', 'orange', 'red']).toContain(bundle.summary.riskColor);
  });

  it('one-screen has market/danger/watch/action', () => {
    const bundle = buildStubConciergeUxBundle();
    const ids = bundle.oneScreen.map((s) => s.id);
    expect(ids).toEqual(['market', 'danger', 'watch', 'action']);
  });

  it('digest appears when multiple proactive titles', () => {
    const titles = Array.from({ length: NOTIFICATION_DIGEST_MIN_COUNT }, (_, i) => ({
      titleJa: `異常${i + 1}`,
      whyJa: 'テスト',
    }));
    const bundle = buildConciergeUxBundle({
      displayMode: 'beginner',
      proactiveTitles: titles,
    });
    expect(bundle.digest).not.toBeNull();
    expect(bundle.digest?.itemCount).toBe(NOTIFICATION_DIGEST_MIN_COUNT);
  });

  it('beginner collapses medium and low by default', () => {
    const bundle = buildConciergeUxBundle({ displayMode: 'beginner' });
    expect(bundle.defaultCollapse.medium).toBe(true);
    expect(bundle.defaultCollapse.low).toBe(true);
    expect(bundle.defaultCollapse.critical).toBe(false);
  });
});
