import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { PortfolioRiskExposureBundle } from '../types/portfolioRiskExposure';
import type { AiStrategyContextPayload } from '../types/aiStrategy';

/** Tighten evidence risk control when portfolio escalation is active */
export function applyPortfolioRiskToEvidence(
  evidence: ConciergeEvidenceBundle,
  bundle: PortfolioRiskExposureBundle | null,
): ConciergeEvidenceBundle {
  if (!bundle?.riskEscalationActive) return evidence;
  return {
    ...evidence,
    riskControl: {
      ...evidence.riskControl,
      allowSpeculativeAi: false,
      allowActionRecommendations:
        evidence.riskControl.allowActionRecommendations && !bundle.defensiveModeActive,
      globalStaleWarningJa: [
        bundle.riskEscalationBannerJa,
        evidence.riskControl.globalStaleWarningJa,
      ]
        .filter(Boolean)
        .join(' · '),
    },
  };
}

export function attachPortfolioRiskToContext(
  payload: AiStrategyContextPayload,
  bundle: PortfolioRiskExposureBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    portfolioRiskExposure: bundle,
    evidenceData: applyPortfolioRiskToEvidence(payload.evidenceData, bundle),
  };
}
