import { describe, expect, it, beforeEach } from 'vitest';
import type { SafeGovernanceRationale } from '../../src/types/explainableGovernanceTransparentReasoning';
import {
  cacheRationales,
  guardExplanationRegeneration,
  hashRationalePayload,
  isSemanticDuplicate,
  resetExplanationStormGuardForTest,
} from '../../src/services/explanationStormGuard';

const sample: SafeGovernanceRationale[] = [
  {
    layerId: 'epistemic',
    layerLabelJa: 'Epistemic',
    rationaleJa: 'unsupported claim — explanation only',
    kind: 'uncertainty',
  },
];

describe('explanationStormGuard', () => {
  beforeEach(() => {
    resetExplanationStormGuardForTest();
  });

  it('hashes rationale payloads consistently', () => {
    const a = hashRationalePayload(sample);
    const b = hashRationalePayload([...sample]);
    expect(a).toBe(b);
  });

  it('detects semantic duplicates after repeated regeneration', () => {
    const hash = hashRationalePayload(sample);
    cacheRationales(hash, sample);
    cacheRationales(hash, sample);
    expect(isSemanticDuplicate(hash)).toBe(true);
  });

  it('reuses cached rationales under storm', () => {
    const first = guardExplanationRegeneration(sample);
    const second = guardExplanationRegeneration(sample);
    expect(second.length).toBeGreaterThan(0);
    expect(second[0].rationaleJa).toBe(first[0].rationaleJa);
  });
});
