import { ANALYSIS_BLOCKED_LABEL_JA } from '../constants/aiRiskControl';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ParsedAiApiJson } from './aiResponseSanitizer';
import { validateAiExplanationAgainstEvidence } from './aiExplanationValidator';

export type HallucinationBlockResult =
  | { blocked: false }
  | { blocked: true; reasonJa: string; validationMismatches: string[] };

/** 取得していない情報を事実として述べた場合に reject */
export function evaluateHallucinationBlock(
  parsed: ParsedAiApiJson,
  displayText: string,
  context: AiStrategyContextPayload,
): HallucinationBlockResult {
  if (!context.evidenceData.riskControl.allowSpeculativeAi) {
    return {
      blocked: true,
      reasonJa: context.evidenceData.riskControl.analysisBlockedJa ?? ANALYSIS_BLOCKED_LABEL_JA,
      validationMismatches: [],
    };
  }

  const validation = validateAiExplanationAgainstEvidence(parsed, displayText, context);
  if (!validation.ok) {
    return {
      blocked: true,
      reasonJa: `幻覚抑制: 回答の数値・銘柄が実データと一致しません。${ANALYSIS_BLOCKED_LABEL_JA}として再確認してください。`,
      validationMismatches: validation.mismatches,
    };
  }

  return { blocked: false };
}
