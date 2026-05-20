import { describe, expect, it } from 'vitest';
import { runDeterministicReplay } from '../../src/services/replayHarness';
import { createEmptyTestAppState } from '../helpers/fixtures/appState';
import {
  BASELINE_REPLAY_SEQUENCE,
  DUPLICATE_ORDER_SPAM,
} from '../helpers/fixtures/replaySequences';

/** ベースライン — シーケンス変更時は意図的に更新 */
const BASELINE_FINGERPRINT = (() => {
  const r = runDeterministicReplay(createEmptyTestAppState(), BASELINE_REPLAY_SEQUENCE);
  return r.stateFingerprint;
})();

describe('persistence: replay regression', () => {
  it('matches baseline fingerprint', () => {
    const result = runDeterministicReplay(createEmptyTestAppState(), BASELINE_REPLAY_SEQUENCE);
    expect(result.stateFingerprint).toBe(BASELINE_FINGERPRINT);
  });

  it('duplicate spam differs from baseline', () => {
    const baseline = runDeterministicReplay(createEmptyTestAppState(), BASELINE_REPLAY_SEQUENCE);
    const spam = runDeterministicReplay(createEmptyTestAppState(), DUPLICATE_ORDER_SPAM);
    expect(spam.stateFingerprint).not.toBe(baseline.stateFingerprint);
  });
});
