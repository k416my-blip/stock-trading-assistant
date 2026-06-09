/**
 * buy — 銘柄別(1023/VYM) 連続buy回数 × 10d × 出来高分割
 * npx vitest run tests/unit/openAiBuySymbolConsecutiveAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const TARGET_SYMBOLS = ['1023', 'VYM'] as const;

type BuyRow = {
  date: string;
  symbol: string;
  consecutiveBuyNumber: number;
  volumeSurgeRatio: number | null;
  volumeGroup: 'vol_lt_12' | 'vol_gte_12' | 'vol_unknown';
  return10d: number | null;
};

const BUCKETS = [
  { id: '1', labelJa: '1回目buy', match: (n: number) => n === 1 },
  { id: '2', labelJa: '2回目buy', match: (n: number) => n === 2 },
  { id: '3', labelJa: '3回目buy', match: (n: number) => n === 3 },
  { id: '4', labelJa: '4回目buy', match: (n: number) => n === 4 },
  { id: '5plus', labelJa: '5回目buy以上', match: (n: number) => n >= 5 },
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

function bucketStats(rows: BuyRow[]) {
  const rets = rows.map((r) => r.return10d).filter((v): v is number => v != null);
  return {
    countTotal: rows.length,
    countWithReturn10d: rets.length,
    avgReturn10d: mean(rets),
    medianReturn10d: median(rets),
    winRate10dPct: winRatePct(rets),
    sharpe10d: sharpeRatio(rets),
    samples: rows.map((r) => ({
      date: r.date,
      consecutiveBuyNumber: r.consecutiveBuyNumber,
      volumeSurgeRatio: r.volumeSurgeRatio,
      return10d: r.return10d,
    })),
  };
}

function statsForSymbol(rows: BuyRow[], filter?: (r: BuyRow) => boolean) {
  const base = filter ? rows.filter(filter) : rows;
  return BUCKETS.map((b) => ({
    bucketId: b.id,
    labelJa: b.labelJa,
    ...bucketStats(base.filter((r) => b.match(r.consecutiveBuyNumber))),
  }));
}

function loadRows(): BuyRow[] {
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
    .filter((o) => o.openAiAction === 'buy' && TARGET_SYMBOLS.includes(o.symbol as (typeof TARGET_SYMBOLS)[number]))
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
      const vol = volMap.get(`${b.date}|${symbol}`) ?? null;
      rows.push({
        date: b.date,
        symbol,
        consecutiveBuyNumber: i + 1,
        volumeSurgeRatio: vol,
        volumeGroup: vol == null ? 'vol_unknown' : vol < 1.2 ? 'vol_lt_12' : 'vol_gte_12',
        return10d: b.return10d,
      });
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

describe('buy symbol consecutive analysis', () => {
  it('writes per-symbol consecutive buy JSON', () => {
    const allRows = loadRows();

    const bySymbol = TARGET_SYMBOLS.map((symbol) => {
      const symRows = allRows.filter((r) => r.symbol === symbol);
      return {
        symbol,
        buyTotal: symRows.length,
        withReturn10d: symRows.filter((r) => r.return10d != null).length,
        all: statsForSymbol(symRows),
        volLt12: statsForSymbol(symRows, (r) => r.volumeGroup === 'vol_lt_12'),
        volGte12: statsForSymbol(symRows, (r) => r.volumeGroup === 'vol_gte_12'),
        volUnknown: symRows
          .filter((r) => r.volumeGroup === 'vol_unknown')
          .map((r) => ({
            date: r.date,
            consecutiveBuyNumber: r.consecutiveBuyNumber,
            return10d: r.return10d,
          })),
        rows: symRows,
      };
    });

    const report = {
      methodologyJa: {
        scope: 'OpenAI buyのみ・銘柄1023/VYM',
        consecutiveDefinition: '銘柄内日付昇順で1,2,3…通算',
        buckets: BUCKETS.map((b) => b.labelJa),
        volumeSplit: '出来高<1.2 vs >=1.2',
        return10d: '翌営業日エントリー→10営業日後',
      },
      symbols: bySymbol,
      insightJa: [
        '1023: 4/21初回〜5/22で21回buy、10d確定15件',
        'VYM: 3回buy（5/18,5/22,5/28）いずれも10d未確定・出来高不明',
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-symbol-consecutive-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== SYMBOL CONSECUTIVE ===\n', JSON.stringify(report, null, 2));
  });
});
