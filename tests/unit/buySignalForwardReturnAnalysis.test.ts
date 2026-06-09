/**
 * OpenAI buy 24 vs RSIプロキシ final buy 16 — 5/10/20営業日後リターン
 * npx vitest run tests/unit/buySignalForwardReturnAnalysis.test.ts
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

type Signal = { date: string; symbol: string };
type HorizonStats = {
  horizonBusinessDays: number;
  sampleCount: number;
  skippedInsufficientBars: number;
  winRatePct: number;
  avgReturnPct: number;
  medianReturnPct: number;
  maxProfitPct: number;
  maxLossPct: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function summarizeReturns(returns: number[], horizon: number, skipped: number): HorizonStats {
  if (returns.length === 0) {
    return {
      horizonBusinessDays: horizon,
      sampleCount: 0,
      skippedInsufficientBars: skipped,
      winRatePct: 0,
      avgReturnPct: 0,
      medianReturnPct: 0,
      maxProfitPct: 0,
      maxLossPct: 0,
    };
  }
  const wins = returns.filter((x) => x > 0).length;
  return {
    horizonBusinessDays: horizon,
    sampleCount: returns.length,
    skippedInsufficientBars: skipped,
    winRatePct: Math.round((wins / returns.length) * 1000) / 10,
    avgReturnPct: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
    medianReturnPct: Math.round(median(returns) * 100) / 100,
    maxProfitPct: Math.round(Math.max(...returns) * 100) / 100,
    maxLossPct: Math.round(Math.min(...returns) * 100) / 100,
  };
}

function forwardReturnsForSignals(
  signals: Signal[],
  barsBySymbol: Map<string, DailyBar[]>,
  horizon: number,
): { returns: number[]; skipped: number; detail: Array<Signal & { returnPct: number }> } {
  const returns: number[] = [];
  const detail: Array<Signal & { returnPct: number }> = [];
  let skipped = 0;
  for (const sig of signals) {
    const bars = barsBySymbol.get(sig.symbol);
    if (!bars) {
      skipped += 1;
      continue;
    }
    const idx = bars.findIndex((b) => b.date === sig.date);
    if (idx < 0 || idx + horizon >= bars.length) {
      skipped += 1;
      continue;
    }
    const entry = bars[idx + 1]!.close;
    const exit = bars[idx + horizon]!.close;
    if (entry <= 0) {
      skipped += 1;
      continue;
    }
    const returnPct = ((exit - entry) / entry) * 100;
    returns.push(returnPct);
    detail.push({ ...sig, returnPct: Math.round(returnPct * 100) / 100 });
  }
  return { returns, skipped, detail };
}

function buildCohortStats(
  label: string,
  signals: Signal[],
  barsBySymbol: Map<string, DailyBar[]>,
  horizons: number[],
) {
  const byHorizon: Record<string, HorizonStats> = {};
  const detailsByHorizon: Record<string, Array<Signal & { returnPct: number }>> = {};
  for (const h of horizons) {
    const { returns, skipped, detail } = forwardReturnsForSignals(signals, barsBySymbol, h);
    byHorizon[`${h}d`] = summarizeReturns(returns, h, skipped);
    detailsByHorizon[`${h}d`] = detail;
  }
  return { label, signalCount: signals.length, byHorizon, detailsByHorizon };
}

function compareHorizons(
  openAi: Record<string, HorizonStats>,
  proxy: Record<string, HorizonStats>,
) {
  const rows: Array<{
    horizon: string;
    openAiBetterOnAvg: boolean;
    openAiBetterWinRate: boolean;
    openAiBetterMedian: boolean;
    deltaAvgReturnPct: number;
    deltaWinRatePct: number;
    deltaMedianPct: number;
    verdictJa: string;
  }> = [];
  for (const key of Object.keys(openAi)) {
    const o = openAi[key]!;
    const p = proxy[key]!;
    const deltaAvg = Math.round((o.avgReturnPct - p.avgReturnPct) * 100) / 100;
    const deltaWin = Math.round((o.winRatePct - p.winRatePct) * 10) / 10;
    const deltaMed = Math.round((o.medianReturnPct - p.medianReturnPct) * 100) / 100;
    const better =
      o.sampleCount > 0 &&
      p.sampleCount > 0 &&
      o.avgReturnPct > p.avgReturnPct &&
      o.winRatePct >= p.winRatePct;
    const worse =
      o.sampleCount > 0 &&
      p.sampleCount > 0 &&
      o.avgReturnPct < p.avgReturnPct &&
      o.medianReturnPct < p.medianReturnPct;
    let verdictJa = '同等・判断保留（サンプル少）';
    if (o.sampleCount === 0 || p.sampleCount === 0) verdictJa = 'データ不足';
    else if (better) verdictJa = 'OpenAI buy が平均・勝率で優位';
    else if (worse) verdictJa = 'RSIプロキシ buy が平均・中央値で優位';
    else if (o.avgReturnPct > p.avgReturnPct) verdictJa = 'OpenAI buy が平均のみ優位（勝率・中央値は混在）';
    else if (p.avgReturnPct > o.avgReturnPct) verdictJa = 'RSIプロキシ buy が平均で優位';
    rows.push({
      horizon: key,
      openAiBetterOnAvg: o.avgReturnPct > p.avgReturnPct,
      openAiBetterWinRate: o.winRatePct > p.winRatePct,
      openAiBetterMedian: o.medianReturnPct > p.medianReturnPct,
      deltaAvgReturnPct: deltaAvg,
      deltaWinRatePct: deltaWin,
      deltaMedianPct: deltaMed,
      verdictJa,
    });
  }
  return rows;
}

describe('buy signal forward return analysis', () => {
  it('aggregates 5/10/20 business-day returns for OpenAI vs proxy', async () => {
    const openAiJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    );
    const proxyJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-vs-proxy-final.json'), 'utf8'),
    );

    const openAiSignals: Signal[] = openAiJson.allRows.map((r: { date: string; symbol: string }) => ({
      date: r.date,
      symbol: r.symbol,
    }));
    const proxySignals: Signal[] = proxyJson.proxyFinalBuyRows.map((r: { date: string; symbol: string }) => ({
      date: r.date,
      symbol: r.symbol,
    }));

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

    const horizons = [5, 10, 20];
    const openAiStats = buildCohortStats('OpenAI buy', openAiSignals, barsBySymbol, horizons);
    const proxyStats = buildCohortStats('RSI proxy final buy', proxySignals, barsBySymbol, horizons);
    const comparison = compareHorizons(openAiStats.byHorizon, proxyStats.byHorizon);

    const overallVerdict = (() => {
      const scored = comparison.filter((c) => c.horizon !== '20d' || openAiStats.byHorizon['20d']!.sampleCount > 0);
      const openAiWins = scored.filter(
        (c) => c.openAiBetterOnAvg && c.openAiBetterWinRate && c.openAiBetterMedian,
      ).length;
      const proxyWins = scored.filter(
        (c) => !c.openAiBetterOnAvg && !c.openAiBetterMedian,
      ).length;
      if (openAiWins >= 2) return '本サンプルでは OpenAI buy の優位は確認できず〜弱い（期間・銘柄偏り大）';
      if (proxyWins >= 2) return '本サンプルでは RSIプロキシ buy の方がリターン面で優位';
      return '優劣はホライズン依存・統計的に断定不可（N小・非重複シグナル）';
    })();

    const report = {
      methodologyJa:
        'シグナル日の翌営業日終値でエントリー、N営業日後の終値でエグジット。同一銘柄のYahoo日足。未来バー不足は当該ホライズンから除外。',
      openAiBuy: openAiStats,
      rsiProxyBuy: proxyStats,
      comparisonByHorizon: comparison,
      overallVerdictJa: overallVerdict,
      caveatsJa: [
        'OpenAI buy 24件とプロキシ buy 16件は日付・銘柄が重複しない別コホート',
        '1023集中・後半シグナルは20営業日後データが切れるため除外増',
        '単純バックテスト（コスト・スリッページ・ポートフォリオ制約なし）',
      ],
    };

    const outPath = path.join(process.cwd(), 'scripts', 'buy-signal-forward-returns.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY SIGNAL FORWARD RETURNS ===\n', JSON.stringify(report, null, 2));
  });
});
