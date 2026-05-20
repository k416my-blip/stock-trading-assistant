import { getExtendedFundamentals } from '../../data/sampleExtendedFundamentals';
import { analyzeHistorical } from './historicalLearning';
import type { InvestmentStyle, RiskLevel, StockFundamentals } from '../../types';
import type { FactorScore } from '../../types/recommendation';
import { isMegaCap } from '../stockCatalog';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** リスク管理スコア（高いほどリスクが低め＝安心寄り） */
export function analyzeRisk(
  stock: StockFundamentals,
  risk: RiskLevel = 'standard',
  style: InvestmentStyle = 'balanced',
): FactorScore {
  const ext = getExtendedFundamentals(stock.symbol);
  const hist = analyzeHistorical(stock.symbol);

  let score = 55;
  if (stock.category === 'etf' || stock.category === 'stable') score += 12;
  if (stock.dividendYield >= 3) score += 8;
  if (stock.per > 0 && stock.per <= 25) score += 6;
  if (ext.debtRatioPct <= 40) score += 8;
  else if (ext.debtRatioPct > 55) score -= 12;
  if (hist.volatilityPct != null) {
    if (hist.volatilityPct < 25) score += 10;
    else if (hist.volatilityPct > 45) score -= 15;
  }
  if (hist.maxDrawdownPct != null && hist.maxDrawdownPct > 25) score -= 10;
  if (isMegaCap(stock)) score -= 8;
  if (stock.category === 'growth' && style === 'short_term') score -= 10;

  if (risk === 'low') {
    if (stock.category === 'growth') score -= 8;
    if (stock.category === 'dividend' || stock.category === 'etf') score += 6;
  } else if (risk === 'high') {
    if (stock.category === 'growth') score += 4;
  }

  return {
    score: clampScore(score),
    label: 'リスク管理',
  };
}
