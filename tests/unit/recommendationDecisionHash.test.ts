import { describe, expect, it } from 'vitest';
import {
  buildDecisionHashPayload,
  computeDecisionHash,
  decisionHashesMatch,
} from '../../src/services/recommendationDecisionHash';
import { sha256Hex } from '../../src/utils/sha256Hex';

describe('recommendationDecisionHash', () => {
  it('computes SHA256(symbol+verdict+buyAllowed+score+confidence)', () => {
    const payload = buildDecisionHashPayload({
      symbol: '5347',
      adoptionVerdict: 'adopt',
      buyAllowed: true,
      recommendationScore: 82,
      confidencePct: 78,
    });
    expect(payload).toBe('5347adopttrue8278');
    expect(computeDecisionHash({
      symbol: '5347',
      adoptionVerdict: 'adopt',
      buyAllowed: true,
      recommendationScore: 82,
      confidencePct: 78,
    })).toBe(sha256Hex('5347adopttrue8278'));
  });

  it('changes hash when verdict fields change', () => {
    const base = {
      symbol: '1023',
      adoptionVerdict: 'hold' as const,
      buyAllowed: false,
      recommendationScore: 70,
      confidencePct: 65,
    };
    const h1 = computeDecisionHash(base);
    const h2 = computeDecisionHash({ ...base, adoptionVerdict: 'adopt', buyAllowed: true });
    expect(decisionHashesMatch(h1, h2)).toBe(false);
  });

  it('normalizes symbol key', () => {
    const a = computeDecisionHash({
      symbol: '5347.KL',
      adoptionVerdict: 'adopt',
      buyAllowed: true,
      recommendationScore: 80,
      confidencePct: 70,
    });
    const b = computeDecisionHash({
      symbol: '5347',
      adoptionVerdict: 'adopt',
      buyAllowed: true,
      recommendationScore: 80,
      confidencePct: 70,
    });
    expect(a).toBe(b);
  });
});
