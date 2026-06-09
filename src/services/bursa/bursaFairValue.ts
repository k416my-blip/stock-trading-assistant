import type { BursaFairValueAnalysis } from '../../types/bursaDisclosure';

/** EPS（sen）× 業界中央 PER → 理論株価（MYR） */
export function computeFairValueByPer(input: {
  currentPrice: number | null;
  epsSen: number | null;
  industryMedianPe: number | null;
}): BursaFairValueAnalysis {
  const { currentPrice, epsSen, industryMedianPe } = input;

  let fairPrice: number | null = null;
  if (epsSen != null && industryMedianPe != null && epsSen > 0 && industryMedianPe > 0) {
    fairPrice = (epsSen / 100) * industryMedianPe;
  }

  let discountPct: number | null = null;
  if (fairPrice != null && currentPrice != null && currentPrice > 0) {
    discountPct = ((fairPrice - currentPrice) / currentPrice) * 100;
  }

  return {
    method: 'PER',
    currentPrice,
    epsSen,
    industryMedianPe,
    fairPrice,
    discountPct,
  };
}
