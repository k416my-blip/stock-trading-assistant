import type { BursaBuffettComponent, BursaDisclosureBundle } from '../../types/bursaDisclosure';
import { averageCompetitiveScore, type computeCompetitiveAdvantage } from './bursaCompetitiveAdvantage';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';

const COMPONENT_MAX = 20;

function scaleRoeScore(avgRoe: number): number {
  if (avgRoe >= 15) return COMPONENT_MAX;
  if (avgRoe <= 0) return 0;
  return Math.round((avgRoe / 15) * COMPONENT_MAX);
}

export function computeBuffettScore(
  bundle: BursaDisclosureBundle,
  competitive: ReturnType<typeof computeCompetitiveAdvantage>,
): { totalScore: number | null; maxScore: number; components: BursaBuffettComponent[] } {
  const trend = buildBursaFiveYearTrend(bundle);
  const components: BursaBuffettComponent[] = [];

  const roeVals = trend.roePct.filter((v): v is number => v != null);
  const avgRoe = roeVals.length > 0 ? roeVals.reduce((a, b) => a + b, 0) / roeVals.length : null;
  components.push({
    labelJa: 'ROE',
    score: avgRoe != null ? scaleRoeScore(avgRoe) : null,
    maxScore: COMPONENT_MAX,
    reasonJa:
      avgRoe != null
        ? `5年ROE平均 ${avgRoe.toFixed(1)}%（KLSE 四半期実績）`
        : 'データ未取得',
  });

  const profitYears = trend.netProfit.filter((v) => v != null);
  const positiveYears = profitYears.filter((v) => v != null && v > 0).length;
  const profitScore =
    profitYears.length > 0 ? Math.round((positiveYears / profitYears.length) * COMPONENT_MAX) : null;
  components.push({
    labelJa: '利益安定性',
    score: profitScore,
    maxScore: COMPONENT_MAX,
    reasonJa:
      profitYears.length > 0
        ? `黒字期 ${positiveYears}/${profitYears.length}（5年純利益推移）`
        : 'データ未取得',
  });

  const divYears = trend.dividend.filter((v) => v != null && v > 0).length;
  const divScore = trend.years.length > 0 ? Math.round((divYears / trend.years.length) * COMPONENT_MAX) : null;
  components.push({
    labelJa: '配当継続',
    score: divScore,
    maxScore: COMPONENT_MAX,
    reasonJa:
      trend.years.length > 0
        ? `配当実績 ${divYears}/${trend.years.length}年（KLSE 配当履歴）`
        : 'データ未取得',
  });

  components.push({
    labelJa: '負債',
    score: null,
    maxScore: COMPONENT_MAX,
    reasonJa: 'KLSE Screener に負債比率データなし（データ未取得）',
  });

  const moatAvg = averageCompetitiveScore(competitive);
  components.push({
    labelJa: '競争優位',
    score: moatAvg != null ? Math.round((moatAvg / 100) * COMPONENT_MAX) : null,
    maxScore: COMPONENT_MAX,
    reasonJa:
      moatAvg != null
        ? `競争優位5項目平均 ${moatAvg.toFixed(0)}/100`
        : 'データ未取得',
  });

  const scored = components.filter((c) => c.score != null);
  const maxScore = components.reduce((a, c) => a + c.maxScore, 0);
  if (scored.length === 0) return { totalScore: null, maxScore, components };

  const rawTotal = scored.reduce((a, c) => a + (c.score ?? 0), 0);
  const rawMax = scored.reduce((a, c) => a + c.maxScore, 0);
  const totalScore = Math.round((rawTotal / rawMax) * 100);
  return { totalScore, maxScore: 100, components };
}
