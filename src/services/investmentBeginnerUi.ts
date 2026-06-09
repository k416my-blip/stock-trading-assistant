/**
 * 投資配分UI — 初心者表示ヘルパー（表示層のみ）
 * @deprecated 新規は beginnerDisplayMapper / beginnerRecommendationSummary を使用
 */
import type { AdoptionVerdict } from '../types/investmentCharter';
import {
  isBeginnerDisplayMode,
  mapVerdictToCardRecommendation,
  resolveInvestmentDisplayMode,
} from './beginnerDisplayMapper';

export type BeginnerTodayJudgment = 'buy' | 'wait' | 'skip';

export function resolveBeginnerTodayJudgment(input: {
  adoptionVerdict: AdoptionVerdict;
  buyAllowed: boolean;
}): { key: BeginnerTodayJudgment; labelJa: string } {
  const mapped = mapVerdictToCardRecommendation(input);
  const key: BeginnerTodayJudgment =
    mapped.key === 'buy' ? 'buy' : mapped.key === 'hold' ? 'wait' : 'skip';
  return { key, labelJa: mapped.labelJa };
}

export function isInvestmentBeginnerMode(
  prefs: Parameters<typeof isBeginnerDisplayMode>[0],
): boolean {
  return isBeginnerDisplayMode(prefs);
}

export {
  resolveInvestmentDisplayMode,
  isTrustDisplayMode,
  isBeginnerDisplayMode,
  isProDisplayMode,
  isSimplifiedInvestmentDisplayMode,
} from './beginnerDisplayMapper';
