import type { PortfolioIntelligenceBundle } from '../types/portfolioIntelligence';
import type { PortfolioThreatWarning } from '../types/autonomousMonitoring';

export function detectPortfolioThreats(
  intel: PortfolioIntelligenceBundle | null,
): PortfolioThreatWarning[] {
  if (!intel) return [];
  const out: PortfolioThreatWarning[] = [];
  const risk = intel.portfolioRisk;

  if (risk.concentrationScore >= 55) {
    out.push({
      id: 'concentration',
      titleJa: 'ポートフォリオの集中が高い',
      detailJa: `集中度スコア ${risk.concentrationScore} — 1銘柄への依存が大きい可能性`,
      severity: risk.concentrationScore >= 70 ? 'high' : 'medium',
    });
  }

  const topSector = risk.sectorBiasJa[0];
  if (topSector && /\d+銘柄/.test(topSector)) {
    const m = topSector.match(/(\d+)銘柄/);
    const n = m ? Number(m[1]) : 0;
    if (n >= 3) {
      out.push({
        id: 'sector_skew',
        titleJa: '同セクターへの偏り',
        detailJa: topSector,
        severity: 'medium',
      });
    }
  }

  if (risk.regionBiasJa.length <= 1 && risk.sectorBiasJa.length <= 2) {
    out.push({
      id: 'correlation',
      titleJa: '相関リスク（地域・セクターが偏っている）',
      detailJa: `${risk.regionBiasJa.join(' · ')} — 同方向の下落に弱い構成の可能性`,
      severity: 'medium',
    });
  }

  return out.slice(0, 4);
}
