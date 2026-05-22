import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ExplainableCognitiveTraceBundle } from '../types/explainableCognitiveTrace';

export function attachExplainableCognitiveTraceToContext(
  payload: AiStrategyContextPayload,
  bundle: ExplainableCognitiveTraceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    explainableCognitiveTrace: bundle,
  };
}
