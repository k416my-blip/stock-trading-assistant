/**
 * buyのみ — RSI帯 × 出来高倍率帯 2次元 × 10dリターン
 * npx vitest run tests/unit/openAiBuyRsiVolumeGridAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type BuyCell = {
  date: string;
  symbol: string;
  rsi14: number;
  volumeSurgeRatio: number;
  return10d: number;
};

const RSI_BANDS = [
  { id: 'lt50', label: 'RSI<50', match: (r: number) => r < 50 },
  { id: '50_55', label: 'RSI50-55', match: (r: number) => r >= 50 && r < 55 },
  { id: '55_60', label: 'RSI55-60', match: (r: number) => r >= 55 && r < 60 },
  { id: '60_65', label: 'RSI60-65', match: (r: number) => r >= 60 && r < 65 },
  { id: '65_70', label: 'RSI65-70', match: (r: number) => r >= 65 && r < 70 },
  { id: 'gt70', label: 'RSI>70', match: (r: number) => r > 70 },
] as const;

const VOL_BANDS = [
  { id: 'lt08', label: 'vol<0.8', match: (v: number) => v < 0.8 },
  { id: '08_10', label: 'vol0.8-1.0', match: (v: number) => v >= 0.8 && v < 1.0 },
  { id: '10_12', label: 'vol1.0-1.2', match: (v: number) => v >= 1.0 && v < 1.2 },
  { id: '12_15', label: 'vol1.2-1.5', match: (v: number) => v >= 1.2 && v < 1.5 },
  { id: '15_20', label: 'vol1.5-2.0', match: (v: number) => v >= 1.5 && v < 2.0 },
  { id: 'gt20', label: 'vol>2.0', match: (v: number) => v >= 2.0 },
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

function cellStats(rows: BuyCell[]) {
  const rets = rows.map((r) => r.return10d);
  return {
    count: rows.length,
    avgReturn10d: mean(rets),
    medianReturn10d: median(rets),
    winRate10dPct: winRatePct(rets),
  };
}

function loadBuyRows(): BuyCell[] {
  const obs = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
  ) as Array<{
    date: string;
    symbol: string;
    rsi14: number;
    openAiAction: string;
    return10d: number | null;
  }>;

  const reg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
  ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
  const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

  const rows: BuyCell[] = [];
  for (const o of obs) {
    if (o.openAiAction !== 'buy' || o.return10d == null) continue;
    const vol = volMap.get(`${o.date}|${o.symbol}`);
    if (vol == null) continue;
    rows.push({
      date: o.date,
      symbol: o.symbol,
      rsi14: o.rsi14,
      volumeSurgeRatio: vol,
      return10d: o.return10d,
    });
  }
  return rows;
}

describe('buy RSI x volume grid', () => {
  it('writes 2d grid and rankings JSON', () => {
    const buys = loadBuyRows();

    const grid = RSI_BANDS.map((rsi) => ({
      rsiBandId: rsi.id,
      rsiBandLabel: rsi.label,
      cells: VOL_BANDS.map((vol) => {
        const inCell = buys.filter((b) => rsi.match(b.rsi14) && vol.match(b.volumeSurgeRatio));
        return {
          volumeBandId: vol.id,
          volumeBandLabel: vol.label,
          ...cellStats(inCell),
          samples: inCell.map((b) => ({
            date: b.date,
            symbol: b.symbol,
            return10d: b.return10d,
          })),
        };
      }),
    }));

    const flatCells = RSI_BANDS.flatMap((rsi) =>
      VOL_BANDS.map((vol) => {
        const inCell = buys.filter((b) => rsi.match(b.rsi14) && vol.match(b.volumeSurgeRatio));
        const stats = cellStats(inCell);
        return {
          rsiBand: rsi.label,
          rsiBandId: rsi.id,
          volumeBand: vol.label,
          volumeBandId: vol.id,
          conditionLabel: `${rsi.label} × ${vol.label}`,
          ...stats,
        };
      }),
    );

    const minCount = 3;
    const ranked = flatCells
      .filter((c) => c.count >= minCount && c.avgReturn10d != null)
      .sort((a, b) => (b.avgReturn10d as number) - (a.avgReturn10d as number))
      .map((c, i) => ({ rank: i + 1, ...c }));

    const top20 = ranked.slice(0, 20);
    const best10 = ranked.slice(0, 10);
    const worst10 = [...ranked].reverse().slice(0, 10).map((c, i) => ({ worstRank: i + 1, ...c }));

    const report = {
      methodologyJa: {
        scope: 'OpenAI buyのみ',
        buyWith10dAndVolume: buys.length,
        buyTotal304: 24,
        rsiBands: RSI_BANDS.map((b) => b.label),
        volumeBands: VOL_BANDS.map((b) => b.label),
        rankingMinCount: minCount,
        return10d: '翌営業日エントリー→10営業日後',
      },
      buyCount: { totalBuy304: 24, analyzed: buys.length },
      grid2d: grid,
      flatMatrix: flatCells,
      top20ByAvgReturn10d: top20,
      best10Conditions: best10,
      worst10Conditions: worst10,
      insightJa: [
        buys.length < 24
          ? `10d・出来高が揃うbuyは${buys.length}件のみ（多くは5月末で10d欠損）`
          : null,
        top20.length === 0
          ? '件数3以上のセルが存在しないためランキングは空'
          : `最良セル: ${best10[0]?.conditionLabel} 平均${best10[0]?.avgReturn10d}% (n=${best10[0]?.count})`,
      ].filter(Boolean),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-rsi-volume-grid.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY RSI x VOL GRID ===\n', JSON.stringify(report, null, 2));
  });
});
