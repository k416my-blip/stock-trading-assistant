/**
 * 出来高倍率帯 × action × 10dリターン
 * npx vitest run tests/unit/openAiVolumeBandReturnAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Row = {
  openAiAction: AiSecondEvaluatorAction;
  volumeSurgeRatio: number;
  return10d: number;
};

const BANDS = [
  { id: 'lt08', label: '<0.8', match: (v: number) => v < 0.8 },
  { id: '08_10', label: '0.8-1.0', match: (v: number) => v >= 0.8 && v < 1.0 },
  { id: '10_12', label: '1.0-1.2', match: (v: number) => v >= 1.0 && v < 1.2 },
  { id: '12_15', label: '1.2-1.5', match: (v: number) => v >= 1.2 && v < 1.5 },
  { id: '15_20', label: '1.5-2.0', match: (v: number) => v >= 1.5 && v < 2.0 },
  { id: 'gt20', label: '>2.0', match: (v: number) => v >= 2.0 },
] as const;

const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

function bandOf(v: number) {
  return BANDS.find((b) => b.match(v))!;
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

function aggregateBand(rows: Row[]) {
  return BANDS.map((band) => {
    const inBand = rows.filter((r) => band.match(r.volumeSurgeRatio));
    const rets = inBand.map((r) => r.return10d);
    return {
      bandId: band.id,
      bandLabel: band.label,
      count: inBand.length,
      avgReturn10d: mean(rets),
      medianReturn10d: median(rets),
      winRate10dPct: winRatePct(rets),
    };
  });
}

function loadRows(): Row[] {
  const obs = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
  ) as Array<{
    date: string;
    symbol: string;
    openAiAction: AiSecondEvaluatorAction;
    return10d: number | null;
  }>;

  const reg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
  ) as Array<{
    date: string;
    symbol: string;
    volumeSurgeRatio: number;
    openAiAction: AiSecondEvaluatorAction;
    return10d: number;
  }>;
  const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

  const rows: Row[] = [];
  for (const o of obs) {
    if (o.return10d == null) continue;
    const vol = volMap.get(`${o.date}|${o.symbol}`);
    if (vol == null) continue;
    rows.push({
      openAiAction: o.openAiAction,
      volumeSurgeRatio: vol,
      return10d: o.return10d,
    });
  }
  return rows;
}

describe('volume band return analysis', () => {
  it('writes volume band x action report', () => {
    const allRows = loadRows();

    const cohorts = {
      all304: { labelJa: '全観測（10d・出来高あり）', rows: allRows, byBand: aggregateBand(allRows) },
      buyOnly: {
        labelJa: 'buyのみ',
        rows: allRows.filter((r) => r.openAiAction === 'buy'),
        byBand: aggregateBand(allRows.filter((r) => r.openAiAction === 'buy')),
      },
      holdOnly: {
        labelJa: 'holdのみ',
        rows: allRows.filter((r) => r.openAiAction === 'hold'),
        byBand: aggregateBand(allRows.filter((r) => r.openAiAction === 'hold')),
      },
      reduceOnly: {
        labelJa: 'reduceのみ',
        rows: allRows.filter((r) => r.openAiAction === 'reduce'),
        byBand: aggregateBand(allRows.filter((r) => r.openAiAction === 'reduce')),
      },
    };

    const cells: Array<{
      action: AiSecondEvaluatorAction;
      bandId: string;
      bandLabel: string;
      count: number;
      avgReturn10d: number | null;
      medianReturn10d: number | null;
      winRate10dPct: number | null;
    }> = [];

    for (const action of ACTIONS) {
      for (const band of BANDS) {
        const sub = allRows.filter((r) => r.openAiAction === action && band.match(r.volumeSurgeRatio));
        const rets = sub.map((r) => r.return10d);
        cells.push({
          action,
          bandId: band.id,
          bandLabel: band.label,
          count: sub.length,
          avgReturn10d: mean(rets),
          medianReturn10d: median(rets),
          winRate10dPct: winRatePct(rets),
        });
      }
    }

    const top10 = cells
      .filter((c) => c.count >= 1 && c.avgReturn10d != null)
      .sort((a, b) => (b.avgReturn10d as number) - (a.avgReturn10d as number))
      .slice(0, 10)
      .map((c, i) => ({
        rank: i + 1,
        action: c.action,
        volumeBand: c.bandLabel,
        count: c.count,
        avgReturn10d: c.avgReturn10d,
        medianReturn10d: c.medianReturn10d,
        winRate10dPct: c.winRate10dPct,
      }));

    const report = {
      methodologyJa: {
        volumeBands: BANDS.map((b) => b.label),
        return10d: '翌営業日エントリー→10営業日後（観測JSON）',
        volumeSource: 'openai-304-regression-dataset.json',
        ranking: 'action×出来高帯の10d平均リターン降順（件数1以上）',
        note: '304のうち出来高・10d両方ある行のみ（204件程度）',
      },
      rowCount: allRows.length,
      cohorts,
      actionByVolumeBand: Object.fromEntries(
        ACTIONS.map((a) => [
          a,
          cells.filter((c) => c.action === a).map(({ action: _a, ...rest }) => rest),
        ]),
      ),
      top10ActionVolumeBandByAvgReturn10d: top10,
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-volume-band-returns.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== VOLUME BAND ===\n', JSON.stringify(report, null, 2));
  });
});
