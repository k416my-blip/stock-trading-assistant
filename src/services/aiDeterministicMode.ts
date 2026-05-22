import { AI_TEMPERATURE_BY_MODE } from '../constants/aiRiskControl';
import type { AiAnalysisMode } from '../constants/aiDataDriven';
import type { AiConciergeConversationMode } from '../types/aiConcierge';

export function resolveAiTemperature(
  analysisMode: AiAnalysisMode,
  conversationMode: AiConciergeConversationMode,
): number {
  const row = AI_TEMPERATURE_BY_MODE[analysisMode];
  return conversationMode === 'analysis' || conversationMode === 'warning'
    ? row.analysis
    : row.default;
}
