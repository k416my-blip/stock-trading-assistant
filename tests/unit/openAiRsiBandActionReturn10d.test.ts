/**
 * RSI帯 × OpenAI action × 10営業日後リターン
 * npx vitest run tests/unit/openAiRsiBandActionReturn10d.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = {
  date: string;
  symbol: string;
  rsi14: number;
  openAiAction: AiSecondEvaluatorAction;
  return10d: number | null;
};

const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

const RSI_BANDS = [
  { id: 'lte30', label: 'RSI <=30', match: (r: number) => r <= 30 },
  { id: '30_40', label: 'RSI 30-40', match: (r: number) => r > 30 && r <= 40 },
  { id: '40_50', label: 'RSI 40-50', match: (r: number) => r > 40 && r <= 50 },
  { id: '50_60', label: 'RSI 50-60', match: (r: number) => r > 50 && r <= 60 },
  { id: '60_70', label: 'RSI 60-70', match: (r: number) => r > 60 && r <= 70 },
  { id: 'gt70', label: 'RSI >70', match: (r: number) => r > 70 },
] as const;

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round(((s[m - 1]! + s[m]!) / 2) * 100) / 100 : Math.round(s[m]! * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function summarizeReturns(rows: Obs[]) {
  const rets = rows.map((r) => r.return10d).filter((v): v is number => v != null);
  return {
    observationCount: rows.length,
    countWithReturn10d: rets.length,
    avgReturn10d: mean(rets),
    medianReturn10d: median(rets),
    winRatePct: winRatePct(rets),
  };
}

function bestActionInBand(
  band: (typeof RSI_BANDS)[number]['id'],
  cells: Record<AiSecondEvaluatorAction, ReturnType<typeof summarizeReturns>>,
): {
  byAvg: AiSecondEvaluatorAction | null;
  byMedian: AiSecondEvaluatorAction | null;
  byWinRate: AiSecondEvaluatorAction | null;
  buyRankByAvg: number | null;
} {
  const ranked = (pick: (s: ReturnType<typeof summarizeReturns>) => number | null) => {
    const scored = ACTIONS.map((a) => ({
      action: a,
      v: pick(cells[a]),
    })).filter((x): x is { action: AiSecondEvaluatorAction; v: number } => x.v != null && cells[x.action].countWithReturn10d >= 1);
    scored.sort((x, y) => y.v - x.v);
    return scored;
  };
  const byAvg = ranked((s) => s.avgReturn10d);
  const byMedian = ranked((s) => s.medianReturn10d);
  const byWin = ranked((s) => s.winRatePct);
  const buyRank = byAvg.findIndex((x) => x.action === 'buy');
  return {
    byAvg: byAvg[0]?.action ?? null,
    byMedian: byMedian[0]?.action ?? null,
    byWinRate: byWin[0]?.action ?? null,
    buyRankByAvg: buyRank >= 0 ? buyRank + 1 : null,
  };
}

describe('RSI band x action 10d returns', () => {
  it('aggregates 304 observations and writes report', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Obs[];

    const matrix = RSI_BANDS.map((band) => {
      const inBand = raw.filter((r) => band.match(r.rsi14));
      const byAction = Object.fromEntries(
        ACTIONS.map((action) => [
          action,
          summarizeReturns(inBand.filter((r) => r.openAiAction === action)),
        ]),
      ) as Record<AiSecondEvaluatorAction, ReturnType<typeof summarizeReturns>>;

      const dominance = bestActionInBand(band.id, byAction);

      return {
        bandId: band.id,
        bandLabel: band.label,
        totalInBand: inBand.length,
        byAction,
        withinBandVerdictJa: {
          bestAvg10d: dominance.byAvg,
          bestMedian10d: dominance.byMedian,
          bestWinRate10d: dominance.byWinRate,
          buyRankByAvgAmongActionsWithData: dominance.buyRankByAvg,
          buyIsDominant:
            dominance.byAvg === 'buy' && dominance.byMedian === 'buy' && dominance.byWinRate === 'buy',
        },
      };
    });

    const bandsWithBuy = matrix.filter((b) => b.byAction.buy.countWithReturn10d > 0);
    const buyDominantBands = bandsWithBuy.filter((b) => b.withinBandVerdictJa.buyIsDominant).map((b) => b.bandLabel);
    const buyNeverBestAvg = bandsWithBuy.filter((b) => b.withinBandVerdictJa.bestAvg10d !== 'buy').map((b) => b.bandLabel);

    const report = {
      methodologyJa:
        '304観測。RSIは当日RSI14。10dリターン=翌営業日エントリー→10営業日後（観測JSON）。同一RSI帯内でaction別の件数・平均・中央値・勝率を比較。',
      observationCount: raw.length,
      matrix,
      summaryJa: {
        bandsWithAnyBuy10d: bandsWithBuy.map((b) => ({
          band: b.bandLabel,
          buyN: b.byAction.buy.countWithReturn10d,
          bestAvg: b.withinBandVerdictJa.bestAvg10d,
          buyAvg: b.byAction.buy.avgReturn10d,
          buyRank: b.withinBandVerdictJa.buyRankByAvgAmongActionsWithData,
        })),
        buyDominantInAllMetrics: buyDominantBands,
        overallConclusion:
          buyDominantBands.length === 0
            ? 'いずれのRSI帯でもbuyが平均・中央値・勝率の3指標すべてで最優位になった帯はない'
            : `buyが全指標最優の帯: ${buyDominantBands.join(', ')}`,
        buyNeverHighestAvgInBands: buyNeverBestAvg,
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-rsi-band-action-10d.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== RSI BAND x ACTION 10d ===\n', JSON.stringify(report, null, 2));
  });
});
