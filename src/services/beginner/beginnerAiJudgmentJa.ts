import type { AiSecondEvaluatorAction } from '../../types/aiSecondEvaluator';

export type BeginnerAiJudgment = 'buy_candidate' | 'monitor' | 'hold' | 'pass';

export const BEGINNER_JUDGMENT_LABEL_JA: Record<BeginnerAiJudgment, string> = {
  buy_candidate: '買い候補',
  monitor: '監視',
  hold: '保有',
  pass: '見送り',
};

export function mapToBeginnerAiJudgment(input: {
  isHeld: boolean;
  fusedAction: AiSecondEvaluatorAction;
  buyAllowed?: boolean;
  finalScore: number;
}): BeginnerAiJudgment {
  const { isHeld, fusedAction, finalScore } = input;
  const buyAllowed = input.buyAllowed ?? true;

  if (!buyAllowed && !isHeld) return 'pass';
  if (fusedAction === 'reduce' && !isHeld) return 'pass';
  if (finalScore <= 35 && !isHeld) return 'pass';

  if (isHeld) {
    if (fusedAction === 'reduce' && finalScore <= 42) return 'monitor';
    if (fusedAction === 'reduce') return 'pass';
    return 'hold';
  }

  if (fusedAction === 'buy' && finalScore >= 58 && buyAllowed) return 'buy_candidate';
  if (fusedAction === 'watch' || (fusedAction === 'hold' && finalScore >= 45)) return 'monitor';
  if (fusedAction === 'reduce') return 'pass';

  return finalScore >= 52 ? 'monitor' : 'pass';
}

/** UX1.1 §6.2 — 「このまま持つ？」への回答 */
export function resolveHoldQuestionAnswerJa(input: {
  judgment: BeginnerAiJudgment;
  isHeld: boolean;
}): { answerJa: string; tone: 'positive' | 'caution' | 'neutral' | 'warning' } {
  const { judgment, isHeld } = input;

  if (!isHeld) {
    return { answerJa: '—', tone: 'neutral' };
  }

  switch (judgment) {
    case 'hold':
      return { answerJa: 'はい、持ち続ける', tone: 'positive' };
    case 'monitor':
      return { answerJa: '様子を見る（監視）', tone: 'caution' };
    case 'buy_candidate':
      return { answerJa: '追加は見送り · 保有は継続', tone: 'neutral' };
    case 'pass':
      return { answerJa: '売却を検討してもよい', tone: 'warning' };
    default:
      return { answerJa: '様子を見る（監視）', tone: 'caution' };
  }
}

/** 今日のAIアドバイス — 一行要約 */
export function formatAdviceLineJa(input: {
  nameJa: string;
  judgment: BeginnerAiJudgment;
  isHeld: boolean;
}): string {
  const { nameJa, judgment, isHeld } = input;
  switch (judgment) {
    case 'hold':
      return isHeld ? `${nameJa}  保有継続` : `${nameJa}  保有`;
    case 'monitor':
      return `${nameJa}  監視`;
    case 'buy_candidate':
      return `${nameJa}  買い候補（検討）`;
    case 'pass':
      return `${nameJa}  見送り`;
    default:
      return `${nameJa}  監視`;
  }
}

export function adviceLineBullet(judgment: BeginnerAiJudgment): 'filled' | 'open' | 'dash' {
  if (judgment === 'hold') return 'filled';
  if (judgment === 'monitor' || judgment === 'buy_candidate') return 'open';
  return 'dash';
}
