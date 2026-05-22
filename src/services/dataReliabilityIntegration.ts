import { ANALYSIS_BLOCKED_LABEL_JA } from '../constants/aiRiskControl';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { DataReliabilityBundle } from '../types/dataReliability';
import type { AiStrategyContextPayload } from '../types/aiStrategy';

/** Merge reliability gate into evidence risk control */
export function applyDataReliabilityToEvidence(
  evidence: ConciergeEvidenceBundle,
  reliability: DataReliabilityBundle | null,
): ConciergeEvidenceBundle {
  if (!reliability) return evidence;
  const bySym = new Map(reliability.symbols.map((s) => [s.symbol.toUpperCase(), s]));
  const symbols = evidence.symbols.map((sym) => {
    const rel = bySym.get(sym.symbol.toUpperCase());
    if (!rel) return sym;
    return sym;
  });

  let riskControl = { ...evidence.riskControl };
  if (!reliability.aiInputGateOpen) {
    riskControl = {
      ...riskControl,
      allowSpeculativeAi: false,
      allowActionRecommendations: false,
      confidenceGateOpen: false,
      analysisBlockedJa:
        reliability.safeFallbackJa ??
        `${ANALYSIS_BLOCKED_LABEL_JA} — ${reliability.aiGateNoteJa}`,
      globalStaleWarningJa:
        reliability.reliabilityBannerJa +
        (riskControl.globalStaleWarningJa ? ` · ${riskControl.globalStaleWarningJa}` : ''),
    };
  } else {
    const minSym = Math.min(...reliability.symbols.map((s) => s.dataQualityScore), 100);
    riskControl = {
      ...riskControl,
      overallDataQualityScore: Math.min(
        riskControl.overallDataQualityScore,
        reliability.globalDataQualityScore,
      ),
      allowSpeculativeAi:
        riskControl.allowSpeculativeAi &&
        minSym >= 45 &&
        reliability.storageIntegrityOk,
    };
  }

  return { ...evidence, symbols, riskControl };
}

export function attachDataReliabilityToContext(
  payload: AiStrategyContextPayload,
  reliability: DataReliabilityBundle | null,
): AiStrategyContextPayload {
  if (!reliability) return payload;
  return {
    ...payload,
    dataReliability: reliability,
    evidenceData: applyDataReliabilityToEvidence(payload.evidenceData, reliability),
  };
}
