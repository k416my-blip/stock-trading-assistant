/**
 * buy — 銘柄別連続buy回数 × 10dリターン × 出来高分割
 * npx vitest run tests/unit/openAiBuyConsecutiveCountAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type BuyRow = {
  date: string;
  symbol: string;
  consecutiveBuyNumber: number;
  consecutiveBucket: '1' | '2' | '3' | '4' | '5plus';
  consecutiveLabelJa: string;
  volumeSurgeRatio: number | null;
  volumeGroup: 'vol_lt_12' | 'vol_gte_12' | 'vol_unknown';
  return10d: number | null;
};

const BUCKETS = [
  { id: '1' as const, labelJa: '初回buy', match: (n: number) => n === 1 },
  { id: '2' as const, labelJa: '2回目buy', match: (n: number) => n === 2 },
  { id: '3' as const, labelJa: '3回目buy', match: (n: number) => n === 3 },
  { id: '4' as const, labelJa: '4回目buy', match: (n: number) => n === 4 },
  { id: '5plus' as const, labelJa: '5回目buy以上', match: (n: number) => n >= 5 },
];

function bucketFor(n: number): BuyRow['consecutiveBucket'] {
  if (n === 1) return '1';
  if (n === 2) return '2';
  if (n === 3) return '3';
  if (n === 4) return '4';
  return '5plus';
}

function labelFor(bucket: BuyRow['consecutiveBucket']): string {
  return BUCKETS.find((b) => b.id === bucket)!.labelJa;
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

function sampleStd(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1));
}

function sharpeRatio(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = mean(vals)!;
  const sd = sampleStd(vals);
  if (sd == null || sd === 0) return null;
  return Math.round((m / sd) * 1000) / 1000;
}

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function horizonStats(rows: BuyRow[]) {
  const rets = rows.map((r) => r.return10d).filter((v): v is number => v != null);
  return {
    countTotal: rows.length,
    countWithReturn10d: rets.length,
    avgReturn10d: mean(rets),
    medianReturn10d: median(rets),
    winRate10dPct: winRatePct(rets),
    sharpe10d: sharpeRatio(rets),
  };
}

function statsByBucket(rows: BuyRow[], filter?: (r: BuyRow) => boolean) {
  const base = filter ? rows.filter(filter) : rows;
  return BUCKETS.map((b) => {
    const inBucket = base.filter((r) => b.match(r.consecutiveBuyNumber));
    return {
      bucketId: b.id,
      labelJa: b.labelJa,
      ...horizonStats(inBucket),
      samples: inBucket.map((r) => ({
        date: r.date,
        symbol: r.symbol,
        consecutiveBuyNumber: r.consecutiveBuyNumber,
        volumeSurgeRatio: r.volumeSurgeRatio,
        return10d: r.return10d,
      })),
    };
  });
}

describe('buy consecutive count analysis', () => {
  it('writes consecutive buy count JSON', () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{
      date: string;
      symbol: string;
      openAiAction: string;
      return10d: number | null;
    }>;

    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

    const buys = obs
      .filter((o) => o.openAiAction === 'buy')
      .sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const bySymbol = new Map<string, typeof buys>();
    for (const b of buys) {
      if (!bySymbol.has(b.symbol)) bySymbol.set(b.symbol, []);
      bySymbol.get(b.symbol)!.push(b);
    }

    const rows: BuyRow[] = [];
    for (const [symbol, list] of bySymbol) {
      list.sort((a, b) => a.date.localeCompare(b.date));
      list.forEach((b, i) => {
        const n = i + 1;
        const vol = volMap.get(`${b.date}|${symbol}`) ?? null;
        const bucket = bucketFor(n);
        rows.push({
          date: b.date,
          symbol,
          consecutiveBuyNumber: n,
          consecutiveBucket: bucket,
          consecutiveLabelJa: labelFor(bucket),
          volumeSurgeRatio: vol,
          volumeGroup:
            vol == null ? 'vol_unknown' : vol < 1.2 ? 'vol_lt_12' : 'vol_gte_12',
          return10d: b.return10d,
        });
      });
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const report = {
      methodologyJa: {
        scope: 'OpenAI buyのみ（304観測）',
        consecutiveDefinition: '銘柄ごとに日付昇順で1,2,3…と通算（シグナル日ベース）',
        buckets: BUCKETS.map((b) => b.labelJa),
        return10d: '観測JSON（翌営業日エントリー→10営業日後）',
        volumeSplit: '出来高<1.2 vs >=1.2（回帰データセット突合、不明は分割外）',
        sharpe: 'mean/std（取引単位、n≥2）',
      },
      counts: {
        buyTotal304: rows.length,
        withReturn10d: rows.filter((r) => r.return10d != null).length,
        volKnown: rows.filter((r) => r.volumeSurgeRatio != null).length,
        bySymbol: Object.fromEntries(
          [...bySymbol.entries()].map(([sym, list]) => [sym, list.length]),
        ),
      },
      allBuys: statsByBucket(rows),
      volLt12: statsByBucket(rows, (r) => r.volumeGroup === 'vol_lt_12'),
      volGte12: statsByBucket(rows, (r) => r.volumeGroup === 'vol_gte_12'),
      volUnknownExcluded: rows
        .filter((r) => r.volumeGroup === 'vol_unknown')
        .map((r) => ({
          date: r.date,
          symbol: r.symbol,
          consecutiveBuyNumber: r.consecutiveBuyNumber,
          return10d: r.return10d,
        })),
      rows,
      insightJa: buildInsight(rows),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-consecutive-count-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY CONSECUTIVE COUNT ===\n', JSON.stringify(report, null, 2));
  });
});

function buildInsight(rows: BuyRow[]): string[] {
  const with10d = rows.filter((r) => r.return10d != null);
  const first = with10d.filter((r) => r.consecutiveBuyNumber === 1);
  const fifthPlus = with10d.filter((r) => r.consecutiveBuyNumber >= 5);
  return [
    `1023は4/21初回〜5/22で${rows.filter((r) => r.symbol === '1023').length}回buy`,
    first.length
      ? `初回buy 10d平均: ${mean(first.map((r) => r.return10d!))}% (n=${first.length})`
      : null,
    fifthPlus.length
      ? `5回目以上 10d平均: ${mean(fifthPlus.map((r) => r.return10d!))}% (n=${fifthPlus.length})`
      : null,
    '5月中旬以降は出来高>=1.2かつ連続5回目以降に集中',
  ].filter(Boolean) as string[];
}
