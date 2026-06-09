import type { BursaDisclosureBundle, BursaTrendDirection, BursaTrendJudgment } from '../../types/bursaDisclosure';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';

const FLAT_BAND_PCT = 3;

function classifySeries(values: (number | null)[]): BursaTrendDirection | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (valid.length < 2) return null;

  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first === 0) return null;

  const changePct = ((last - first) / Math.abs(first)) * 100;
  if (changePct > FLAT_BAND_PCT) return '上昇';
  if (changePct < -FLAT_BAND_PCT) return '下降';
  return '横ばい';
}

export function computeTrendJudgment(bundle: BursaDisclosureBundle): BursaTrendJudgment {
  const trend = buildBursaFiveYearTrend(bundle);
  return {
    revenue: classifySeries(trend.revenue),
    netProfit: classifySeries(trend.netProfit),
    eps: classifySeries(trend.eps),
  };
}
