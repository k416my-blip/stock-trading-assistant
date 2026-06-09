import type { AiSecondEvaluatorBatchResult, AiSecondEvaluatorSymbolInput } from '../types/aiSecondEvaluator';

const MOCK_FALLBACK = 'mock_fallback';

function inputsUseNewsApi(inputs: AiSecondEvaluatorSymbolInput[]): boolean {
  return inputs.some(
    (i) =>
      (i.newsApiCount ?? 0) > 0 ||
      /newsapi/i.test(String(i.newsSource ?? '')),
  );
}

function inputsUseTwelveData(inputs: AiSecondEvaluatorSymbolInput[]): boolean {
  return inputs.some((i) => /twelve/i.test(String(i.quoteSource ?? '')));
}

function inputsHaveLiveIndicators(inputs: AiSecondEvaluatorSymbolInput[]): boolean {
  return inputs.some(
    (i) =>
      i.rsi14 != null &&
      i.rsiSource !== 'local_price_history' &&
      i.rsiSource !== 'insufficient_bars',
  );
}

/**
 * Action Center 表示用ソース（mock_fallback は出さない）。
 * 例: hybrid · twelve_data · newsapi · openai · rule_only
 */
export function resolvePortfolioBatchSourceLabel(
  batch: AiSecondEvaluatorBatchResult,
  inputs: AiSecondEvaluatorSymbolInput[],
): string {
  const hasNews = inputsUseNewsApi(inputs);
  const hasTwelve = inputsUseTwelveData(inputs);
  const hasIndicators = inputsHaveLiveIndicators(inputs);
  const openAiUsed = batch.source === 'openai' || batch.source === 'cache';

  if (openAiUsed) {
    if (hasNews && (hasTwelve || hasIndicators)) return 'hybrid';
    if (hasNews) return 'hybrid';
    return 'hybrid';
  }

  if (batch.source === MOCK_FALLBACK || batch.source === 'skipped') {
    if (hasNews && hasTwelve) return 'hybrid';
    if (hasNews && hasIndicators) return 'hybrid';
    if (hasNews) return 'newsapi';
    if (hasTwelve) return 'twelve_data';
    if (hasIndicators) return 'hybrid';
    return 'rule_only';
  }

  return batch.source;
}
