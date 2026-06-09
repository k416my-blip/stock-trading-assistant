/**
 * 全304観測 × OpenAI action別 — 1/3/5/10営業日後リターン
 * npx vitest run tests/unit/openAiActionHorizonReturnAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = {
  date: string;
  symbol: string;
  openAiAction: AiSecondEvaluatorAction;
};

type HorizonDef = { id: string; labelJa: string; exitOffset: number; entryOffset: number };

const HORIZONS: HorizonDef[] = [
  { id: 'd1', labelJa: '翌営業日', exitOffset: 1, entryOffset: 0 },
  { id: 'd3', labelJa: '3営業日後', exitOffset: 3, entryOffset: 1 },
  { id: 'd5', labelJa: '5営業日後', exitOffset: 5, entryOffset: 1 },
  { id: 'd10', labelJa: '10営業日後', exitOffset: 10, entryOffset: 1 },
];

const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

function forwardReturnPct(bars: DailyBar[], date: string, h: HorizonDef): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0) return null;
  const entryIdx = idx + h.entryOffset;
  const exitIdx = idx + h.exitOffset;
  if (exitIdx >= bars.length || entryIdx >= bars.length || entryIdx < 0) return null;
  const entry = bars[entryIdx]!.close;
  const exit = bars[exitIdx]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function summarize(returns: number[]) {
  if (returns.length === 0) {
    return { count: 0, avgPct: null, medianPct: null, winRatePct: null };
  }
  const wins = returns.filter((r) => r > 0).length;
  return {
    count: returns.length,
    avgPct: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
    medianPct: Math.round(median(returns) * 100) / 100,
    winRatePct: Math.round((wins / returns.length) * 1000) / 10,
  };
}

describe('OpenAI action horizon returns (304 obs)', () => {
  it('aggregates by buy/hold/watch/reduce for 1/3/5/10d', async () => {
    const obsPath = path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json');
    const raw = JSON.parse(fs.readFileSync(obsPath, 'utf8')) as Array<{
      date: string;
      symbol: string;
      openAiAction: AiSecondEvaluatorAction;
    }>;

    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const enriched: Array<Obs & Record<string, number | null>> = raw.map((r) => {
      const bars = barsBySymbol.get(r.symbol)!;
      const row: Obs & Record<string, number | null> = { ...r };
      for (const h of HORIZONS) {
        row[`ret_${h.id}`] = forwardReturnPct(bars, r.date, h);
      }
      return row;
    });

    const byHorizon: Record<string, Record<string, ReturnType<typeof summarize>>> = {};
    for (const h of HORIZONS) {
      const byAction: Record<string, ReturnType<typeof summarize>> = {};
      for (const action of ACTIONS) {
        const rets = enriched
          .filter((o) => o.openAiAction === action)
          .map((o) => o[`ret_${h.id}`])
          .filter((v): v is number => v != null);
        byAction[action] = summarize(rets);
      }
      byHorizon[h.id] = byAction;
    }

    const ranking = HORIZONS.map((h) => {
      const rows = ACTIONS.map((action) => ({
        action,
        ...byHorizon[h.id]![action]!,
      })).filter((r) => r.count > 0);
      const byAvg = [...rows].sort((a, b) => (b.avgPct ?? -999) - (a.avgPct ?? -999));
      const byMedian = [...rows].sort((a, b) => (b.medianPct ?? -999) - (a.medianPct ?? -999));
      const byWin = [...rows].sort((a, b) => (b.winRatePct ?? -999) - (a.winRatePct ?? -999));
      return {
        horizon: h.labelJa,
        bestAvg: byAvg[0],
        bestMedian: byMedian[0],
        bestWinRate: byWin[0],
        all: rows,
      };
    });

    const report = {
      methodologyJa:
        '翌営業日=シグナル日終値→翌営業日終値。3/5/10営業日後=シグナル翌日終値エントリー→3/5/10営業日後終値（従来5d/10d監査と同型）。欠損は除外。',
      observationCount: enriched.length,
      actionCounts: Object.fromEntries(
        ACTIONS.map((a) => [a, enriched.filter((o) => o.openAiAction === a).length]),
      ),
      byHorizon,
      ranking,
      overallVerdictJa: ranking.map(
        (r) =>
          `${r.horizon}: 平均最良=${r.bestAvg?.action}(${r.bestAvg?.avgPct}%)、中央値最良=${r.bestMedian?.action}(${r.bestMedian?.medianPct}%)、勝率最良=${r.bestWinRate?.action}(${r.bestWinRate?.winRatePct}%)`,
      ),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-action-horizon-returns.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI ACTION HORIZON RETURNS ===\n', JSON.stringify(report, null, 2));
  });
});
