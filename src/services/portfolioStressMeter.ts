import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { PortfolioIntelligenceBundle } from '../types/portfolioIntelligence';
import type { PortfolioStressMeter } from '../types/autonomousMonitoring';
import type { PortfolioThreatWarning } from '../types/autonomousMonitoring';

export function buildPortfolioStressMeter(
  intel: PortfolioIntelligenceBundle | null,
  global: GlobalMarketAnalysisBundle | null,
  threats: PortfolioThreatWarning[],
): PortfolioStressMeter {
  let score = 35;
  const factors: string[] = [];

  if (intel) {
    score += Math.min(25, intel.portfolioRisk.concentrationScore * 0.25);
    if (intel.portfolioRisk.concentrationScore >= 50) {
      factors.push(`集中度 ${intel.portfolioRisk.concentrationScore}`);
    }
    if (intel.behavior.panicSellScore >= 35) {
      score += 10;
      factors.push('過去のパニック売り傾向');
    }
  }

  if (global) {
    score += global.marketScores.marketRiskScore * 0.2;
    score += global.marketScores.fearScore * 0.15;
    factors.push(`市場リスク ${global.marketScores.marketRiskScore}`);
  }

  score += threats.filter((t) => t.severity === 'high').length * 12;
  score = Math.min(100, Math.round(score));

  let color: PortfolioStressMeter['color'] = 'green';
  let labelJa = '落ち着き';
  if (score >= 75) {
    color = 'red';
    labelJa = '高ストレス';
  } else if (score >= 55) {
    color = 'orange';
    labelJa = '警戒';
  } else if (score >= 40) {
    color = 'yellow';
    labelJa = '注意';
  }

  return {
    score,
    labelJa,
    color,
    factorsJa: factors.length ? factors : ['大きな偏りは限定的'],
  };
}
