/**
 * 同銘柄・同RSI帯: buy vs hold/watch/reduce（1023, VYM）
 * npx vitest run tests/unit/openAiBuyMatchedBandSymbolAnalysis.test.ts
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
  return5d: number | null;
  return10d: number | null;
};

const SYMBOLS = ['1023', 'VYM'] as const;
const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

const RSI_BANDS = [
  { id: 'lte30', label: 'RSI <=30', match: (r: number) => r <= 30 },
  { id: '30_40', label: 'RSI 30-40', match: (r: number) => r > 30 && r <= 40 },
  { id: '40_50', label: 'RSI 40-50', match: (r: number) => r > 40 && r <= 50 },
  { id: '50_60', label: 'RSI 50-60', match: (r: number) => r > 50 && r <= 60 },
  { id: '60_70', label: 'RSI 60-70', match: (r: number) => r > 60 && r <= 70 },
  { id: 'gt70', label: 'RSI >70', match: (r: number) => r > 70 },
] as const;

function bandForRsi(rsi: number) {
  return RSI_BANDS.find((b) => b.match(rsi))!;
}

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

function stats(rows: Obs[], field: 'return5d' | 'return10d') {
  const rets = rows.map((r) => r[field]).filter((v): v is number => v != null);
  return {
    observationCount: rows.length,
    countWithReturn: rets.length,
    avg: mean(rets),
    median: median(rets),
    winRatePct: winRatePct(rets),
  };
}

function rankActions(
  cells: Record<AiSecondEvaluatorAction, ReturnType<typeof stats>>,
  field: 'return5d' | 'return10d',
  metric: 'avg' | 'median' | 'winRatePct',
) {
  const scored = ACTIONS.map((a) => ({
    action: a,
    v: cells[a][metric],
    n: cells[a].countWithReturn,
  })).filter((x): x is { action: AiSecondEvaluatorAction; v: number; n: number } => x.v != null && x.n > 0);
  scored.sort((x, y) => y.v - x.v);
  const buyRank = scored.findIndex((x) => x.action === 'buy');
  return {
    ranking: scored.map((x) => ({ action: x.action, value: x.v, n: x.n })),
    buyRank: buyRank >= 0 ? buyRank + 1 : null,
    best: scored[0]?.action ?? null,
  };
}

describe('buy vs same symbol RSI band peers', () => {
  it('writes 1023 and VYM matched-band report', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Obs[];

    const bySymbol = SYMBOLS.map((symbol) => {
      const symRows = raw.filter((r) => r.symbol === symbol);
      const buyRows = symRows.filter((r) => r.openAiAction === 'buy');
      const bandsWithBuy = [...new Set(buyRows.map((r) => bandForRsi(r.rsi14).id))];

      const bandComparisons = bandsWithBuy.map((bandId) => {
        const band = RSI_BANDS.find((b) => b.id === bandId)!;
        const inBand = symRows.filter((r) => band.match(r.rsi14));
        const cells5 = Object.fromEntries(
          ACTIONS.map((a) => [a, stats(inBand.filter((r) => r.openAiAction === a), 'return5d')]),
        ) as Record<AiSecondEvaluatorAction, ReturnType<typeof stats>>;
        const cells10 = Object.fromEntries(
          ACTIONS.map((a) => [a, stats(inBand.filter((r) => r.openAiAction === a), 'return10d')]),
        ) as Record<AiSecondEvaluatorAction, ReturnType<typeof stats>>;

        return {
          bandId,
          bandLabel: band.label,
          totalObservationsInBand: inBand.length,
          buyObservationCount: inBand.filter((r) => r.openAiAction === 'buy').length,
          byAction: Object.fromEntries(
            ACTIONS.map((action) => {
              const subset = inBand.filter((r) => r.openAiAction === action);
              return [
                action,
                {
                  observationCount: subset.length,
                  return5d: stats(subset, 'return5d'),
                  return10d: stats(subset, 'return10d'),
                },
              ];
            }),
          ),
          buyDominance: {
            return5d: {
              avg: rankActions(cells5, 'return5d', 'avg'),
              median: rankActions(cells5, 'return5d', 'median'),
              winRate: rankActions(cells5, 'return5d', 'winRatePct'),
            },
            return10d: {
              avg: rankActions(cells10, 'return10d', 'avg'),
              median: rankActions(cells10, 'return10d', 'median'),
              winRate: rankActions(cells10, 'return10d', 'winRatePct'),
            },
          },
          verdictJa:
            rankActions(cells10, 'return10d', 'avg').buyRank === 1 &&
            rankActions(cells10, 'return10d', 'median').buyRank === 1 &&
            rankActions(cells10, 'return10d', 'winRatePct').buyRank === 1
              ? '同一銘柄・同RSI帯でbuyが10dの3指標すべて1位'
              : 'buyは同帯内で最優ではない、または比較件数不足',
        };
      });

      const buyBandsSummary = bandComparisons.map((b) => ({
        band: b.bandLabel,
        buy5d: b.byAction.buy.return5d,
        buy10d: b.byAction.buy.return10d,
        best5dAvg: b.buyDominance.return5d.avg.best,
        best10dAvg: b.buyDominance.return10d.avg.best,
        buyRank10dAvg: b.buyDominance.return10d.avg.buyRank,
      }));

      const anyBandBuyDominant = bandComparisons.some(
        (b) =>
          b.buyDominance.return10d.avg.buyRank === 1 &&
          b.buyDominance.return10d.median.buyRank === 1 &&
          b.buyDominance.return10d.winRate.buyRank === 1,
      );

      return {
        symbol,
        totalObservations: symRows.length,
        buyCount: buyRows.length,
        bandsWithBuy: bandsWithBuy.map((id) => RSI_BANDS.find((b) => b.id === id)!.label),
        bandComparisons,
        symbolVerdictJa: anyBandBuyDominant
          ? `${symbol}: 一部RSI帯でbuyが同帯内全指標1位`
          : `${symbol}: 同銘柄・同RSI帯ではbuyの独自優位性は確認されない`,
      };
    });

    const report = {
      methodologyJa:
        '1023/VYM限定。各RSI帯でOpenAI action別に5d/10d（翌日エントリー）の件数・平均・中央値・勝率。buyが存在する帯のみ比較表を出力。',
      uniqueAlphaConclusionJa: (() => {
        const allDominant = bySymbol.every((s) =>
          s.bandComparisons.every(
            (b) =>
              b.buyObservationCount === 0 ||
              (b.buyDominance.return10d.avg.buyRank !== 1 &&
                b.buyDominance.return10d.median.buyRank !== 1),
          ),
        );
        if (allDominant) {
          return 'RSI・銘柄を揃えても、buyが一貫して同帯内最優になる帯はない。OpenAI buyの独自優位性（10dリターン）は本サンプルでは支持されない。';
        }
        return '一部条件下のみbuy優位の可能性あり（bandComparisons参照）';
      })(),
      bySymbol,
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-matched-band-1023-vym.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== MATCHED BAND 1023 VYM ===\n', JSON.stringify(report, null, 2));
  });
});
