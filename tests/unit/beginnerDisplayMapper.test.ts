import { describe, expect, it } from 'vitest';
import {
  buildBeginnerNaturalExplanation,
  isBeginnerDisplayMode,
  isSimplifiedInvestmentDisplayMode,
  isTrustDisplayMode,
  mapConfidenceToCertaintyLabel,
  mapScoreToGradeLabel,
  mapVerdictToBeginnerPhrase,
  mapVerdictToCardRecommendation,
  resolveInvestmentDisplayMode,
  sanitizeBeginnerText,
} from '../../src/services/beginnerDisplayMapper';

describe('beginnerDisplayMapper', () => {
  it('defaults to trust display mode when unset', () => {
    expect(resolveInvestmentDisplayMode(null)).toBe('trust');
    expect(resolveInvestmentDisplayMode({})).toBe('trust');
    expect(isBeginnerDisplayMode({})).toBe(false);
    expect(isTrustDisplayMode({})).toBe(true);
  });

  it('resolves pro from investmentDisplayMode or legacy flag', () => {
    expect(resolveInvestmentDisplayMode({ investmentDisplayMode: 'pro' })).toBe('pro');
    expect(resolveInvestmentDisplayMode({ investmentBeginnerMode: false })).toBe('pro');
  });

  it('resolves trust display mode', () => {
    expect(resolveInvestmentDisplayMode({ investmentDisplayMode: 'trust' })).toBe('trust');
    expect(isTrustDisplayMode({ investmentDisplayMode: 'trust' })).toBe(true);
    expect(isSimplifiedInvestmentDisplayMode({ investmentDisplayMode: 'trust' })).toBe(true);
    expect(isSimplifiedInvestmentDisplayMode({ investmentDisplayMode: 'beginner' })).toBe(true);
    expect(isSimplifiedInvestmentDisplayMode({ investmentDisplayMode: 'pro' })).toBe(false);
  });

  it('maps verdicts to 買う/保留/見送る', () => {
    expect(
      mapVerdictToCardRecommendation({ adoptionVerdict: 'adopt', buyAllowed: true }).labelJa,
    ).toBe('買う');
    expect(
      mapVerdictToCardRecommendation({ adoptionVerdict: 'hold', buyAllowed: true }).labelJa,
    ).toBe('保留');
    expect(
      mapVerdictToCardRecommendation({ adoptionVerdict: 'reject', buyAllowed: false }).labelJa,
    ).toBe('見送る');
  });

  it('maps BUY/HOLD/REJECT to beginner phrases', () => {
    expect(
      mapVerdictToBeginnerPhrase({ adoptionVerdict: 'adopt', buyAllowed: true }),
    ).toBe('買ってもよい候補');
    expect(mapVerdictToBeginnerPhrase({ adoptionVerdict: 'hold', buyAllowed: true })).toBe(
      '今は待つ',
    );
    expect(
      mapVerdictToBeginnerPhrase({ adoptionVerdict: 'reject', buyAllowed: false }),
    ).toBe('買わない');
  });

  it('maps score to A-D and confidence to 高/中/低', () => {
    expect(mapScoreToGradeLabel(85)).toBe('A');
    expect(mapScoreToGradeLabel(70)).toBe('B');
    expect(mapScoreToGradeLabel(55)).toBe('C');
    expect(mapScoreToGradeLabel(40)).toBe('D');
    expect(mapConfidenceToCertaintyLabel('high')).toBe('高');
    expect(mapConfidenceToCertaintyLabel('low')).toBe('低');
  });

  it('strips jargon from beginner text', () => {
    const cleaned = sanitizeBeginnerText('PER 12倍でRSI過熱、Malaysia v4一致');
    expect(cleaned.toLowerCase()).not.toContain('per');
    expect(cleaned.toLowerCase()).not.toContain('rsi');
  });

  it('builds natural explanation without jargon labels', () => {
    const text = buildBeginnerNaturalExplanation({
      name: 'Maybank',
      recommendationPhrase: '買ってもよい候補',
      reasons: ['配当が安定'],
      cautions: ['値段が上下する'],
    });
    expect(text).toContain('Maybank');
    expect(text).not.toContain('Red Team');
    expect(text).not.toContain('decisionHash');
  });
});
