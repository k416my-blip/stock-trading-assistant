import {
  AI_ANALYSIS_MODE_HINTS_JA,
  AI_ANALYSIS_MODE_ORDER,
  type AiAnalysisMode,
} from '../constants/aiDataDriven';

const DEFAULT_MODE: AiAnalysisMode = 'balanced';

export function normalizeAiAnalysisMode(value: unknown): AiAnalysisMode {
  if (typeof value === 'string' && (AI_ANALYSIS_MODE_ORDER as readonly string[]).includes(value)) {
    return value as AiAnalysisMode;
  }
  return DEFAULT_MODE;
}

export function buildAnalysisModeInstructions(mode: AiAnalysisMode): string {
  return `分析モード: ${mode} — ${AI_ANALYSIS_MODE_HINTS_JA[mode]}`;
}
