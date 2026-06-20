import { describe, expect, it } from 'vitest';
import {
  mapToBeginnerAiJudgment,
  resolveHoldQuestionAnswerJa,
  formatAdviceLineJa,
} from '../../src/services/beginner/beginnerAiJudgmentJa';

describe('mapToBeginnerAiJudgment', () => {
  it('maps held hold to hold', () => {
    expect(
      mapToBeginnerAiJudgment({
        isHeld: true,
        fusedAction: 'hold',
        finalScore: 60,
      }),
    ).toBe('hold');
  });

  it('maps held reduce with low score to monitor', () => {
    expect(
      mapToBeginnerAiJudgment({
        isHeld: true,
        fusedAction: 'reduce',
        finalScore: 40,
      }),
    ).toBe('monitor');
  });

  it('maps unheld buy with high score to buy_candidate', () => {
    expect(
      mapToBeginnerAiJudgment({
        isHeld: false,
        fusedAction: 'buy',
        finalScore: 65,
        buyAllowed: true,
      }),
    ).toBe('buy_candidate');
  });

  it('maps unheld watch to monitor', () => {
    expect(
      mapToBeginnerAiJudgment({
        isHeld: false,
        fusedAction: 'watch',
        finalScore: 50,
      }),
    ).toBe('monitor');
  });
});

describe('resolveHoldQuestionAnswerJa', () => {
  it('returns positive hold answer', () => {
    expect(
      resolveHoldQuestionAnswerJa({ judgment: 'hold', isHeld: true }).answerJa,
    ).toBe('はい、持ち続ける');
  });

  it('returns caution for monitor', () => {
    expect(
      resolveHoldQuestionAnswerJa({ judgment: 'monitor', isHeld: true }).answerJa,
    ).toBe('様子を見る（監視）');
  });
});

describe('formatAdviceLineJa', () => {
  it('formats held continuation', () => {
    expect(
      formatAdviceLineJa({ nameJa: 'Maybank', judgment: 'hold', isHeld: true }),
    ).toBe('Maybank  保有継続');
  });
});
