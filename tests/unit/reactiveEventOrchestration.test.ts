import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/reactiveEventOrchestrationStorage', () => ({
  persistImportantEvent: vi.fn(async () => undefined),
  loadPersistedReactiveEvents: vi.fn(async () => ({
    version: 1,
    importantEvents: [],
    lastReplayAt: null,
  })),
  markReactiveReplayComplete: vi.fn(async () => undefined),
}));

import {
  dispatchConciergeEvent,
  resetReactiveOrchestrationForTest,
  shouldRecomputeLayer,
  getOrchestrationMetrics,
} from '../../src/services/reactiveEventOrchestrationRuntime';
import { buildReactiveEventOrchestrationBundle } from '../../src/services/reactiveEventOrchestrationEngine';
import { layersForEventType } from '../../src/constants/reactiveEventOrchestration';

describe('reactiveEventOrchestrationRuntime', () => {
  beforeEach(() => {
    resetReactiveOrchestrationForTest();
  });

  it('dedupes events with same dedupeKey', () => {
    dispatchConciergeEvent({ type: 'market_update', dedupeKey: 'price-1' });
    dispatchConciergeEvent({ type: 'market_update', dedupeKey: 'price-1' });
    const m = getOrchestrationMetrics();
    expect(m.queued.length + m.active.length).toBeLessThanOrEqual(1);
    expect(m.batchedTotal).toBeGreaterThan(0);
  });

  it('governance_veto triggers selective layers only', () => {
    dispatchConciergeEvent({ type: 'governance_veto', dedupeKey: 'v1' });
    const layers = layersForEventType('governance_veto');
    expect(layers).toContain('governance');
    expect(layers).toContain('strategy');
    expect(layers).not.toContain('macro');
  });
});

describe('buildReactiveEventOrchestrationBundle', () => {
  it('builds dashboard with 30 features', () => {
    const bundle = buildReactiveEventOrchestrationBundle({
      batterySaverEnabled: false,
      appForeground: true,
      memoryPressure: false,
      renderBudgetInFlight: 1,
      renderBudgetBlocked: 0,
      renderBudgetMax: 4,
    });
    expect(bundle.featureStatuses).toHaveLength(30);
    expect(bundle.dependencyGraph.length).toBeGreaterThan(5);
  });
});
