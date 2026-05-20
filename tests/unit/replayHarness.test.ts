import { describe, expect, it } from 'vitest';
import { runDeterministicReplay } from '../../src/services/replayHarness';
import { createEmptyTestAppState } from '../helpers/fixtures/appState';
import { BASELINE_REPLAY_SEQUENCE } from '../helpers/fixtures/replaySequences';

describe('replayHarness', () => {
  it('produces deterministic fingerprint', () => {
    const initial = createEmptyTestAppState();
    const a = runDeterministicReplay(initial, BASELINE_REPLAY_SEQUENCE);
    const b = runDeterministicReplay(initial, BASELINE_REPLAY_SEQUENCE);
    expect(a.stateFingerprint).toBe(b.stateFingerprint);
    expect(a.practiceChecksum).toBe(b.practiceChecksum);
  });

  it('accumulates practice holdings', () => {
    const result = runDeterministicReplay(createEmptyTestAppState(), BASELINE_REPLAY_SEQUENCE);
    const active = result.finalState.practice.portfolio.filter((p) => p.shares > 0);
    expect(active.length).toBe(1);
    expect(active[0].shares).toBe(10);
  });
});
