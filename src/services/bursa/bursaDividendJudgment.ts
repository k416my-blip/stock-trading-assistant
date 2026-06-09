import type { BursaDisclosureBundle, BursaDividendJudgment } from '../../types/bursaDisclosure';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';

export function computeDividendJudgment(bundle: BursaDisclosureBundle): BursaDividendJudgment {
  const trend = buildBursaFiveYearTrend(bundle);
  const divs = trend.dividend.filter((v): v is number => v != null && v > 0);

  const currentDividend = divs.length > 0 ? divs[divs.length - 1] : null;
  const fiveYearAverage =
    divs.length > 0 ? divs.reduce((a, b) => a + b, 0) / divs.length : null;

  let growthRatePct: number | null = null;
  if (divs.length >= 2) {
    const first = divs[0];
    const last = divs[divs.length - 1];
    if (first > 0) {
      growthRatePct = ((last - first) / first) * 100;
    }
  }

  const cutYears: number[] = [];
  for (let i = 1; i < trend.points.length; i++) {
    const prev = trend.points[i - 1].dividend;
    const curr = trend.points[i].dividend;
    if (prev != null && curr != null && curr < prev * 0.995) {
      cutYears.push(trend.points[i].year);
    }
  }

  const cutCount = cutYears.length > 0 ? cutYears.length : divs.length >= 2 ? 0 : null;

  let rating: BursaDividendJudgment['rating'] = null;
  if (currentDividend != null && fiveYearAverage != null) {
    if (cutCount != null && cutCount > 0) {
      rating = '注意';
    } else if (
      growthRatePct != null &&
      growthRatePct > 0 &&
      currentDividend >= fiveYearAverage
    ) {
      rating = '優秀';
    } else {
      rating = '普通';
    }
  }

  return {
    currentDividend,
    fiveYearAverage,
    growthRatePct,
    cutCount,
    cutYears,
    rating,
  };
}
