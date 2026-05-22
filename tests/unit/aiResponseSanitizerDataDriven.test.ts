import { describe, expect, it } from 'vitest';
import {
  containsVagueOnlyAnswer,
  sanitizeAiText,
} from '../../src/services/aiResponseSanitizer';
import { AI_INSUFFICIENT_DATA_PHRASE_JA } from '../../src/constants/aiDataDriven';

describe('aiResponseSanitizer data-driven', () => {
  it('flags vague-only answers without numbers', () => {
    expect(containsVagueOnlyAnswer('様々な要因があります')).toBe(true);
    expect(containsVagueOnlyAnswer('下落率 -5.2% と出来高 2.1倍')).toBe(false);
  });

  it('replaces vague-only with insufficient data phrase', () => {
    const out = sanitizeAiText('可能性があります');
    expect(out).toContain(AI_INSUFFICIENT_DATA_PHRASE_JA);
  });
});
