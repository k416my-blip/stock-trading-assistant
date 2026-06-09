/**
 * OpenAI buy 集約5ストリーク — 詳細・勝敗分析
 * npx vitest run tests/unit/openAiStreakDetailAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import {
  computeRsi14At,
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';

type Streak = { symbol: string; firstDate: string; lastDate: string; rawDayCount: number };

function forwardReturn(
  symbol: string,
  date: string,
  bars: DailyBar[],
  horizon: number,
): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return Math.round((((exit - entry) / entry) * 100) * 100) / 100;
}

function dayChangeAt(bars: DailyBar[], date: string): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 1) return null;
  const prev = bars[idx - 1]!.close;
  const cur = bars[idx]!.close;
  if (prev <= 0) return null;
  return Math.round((((cur - prev) / prev) * 100) * 100) / 100;
}

describe('OpenAI streak detail analysis', () => {
  it('prints streak table and win/loss patterns', async () => {
    const clustered = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-clustered-returns.json'), 'utf8'),
    );
    const hybrid = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    );
    const streaks: Streak[] = clustered.streaks;

    const hybridByKey = new Map(
      hybrid.allRows.map((r: { date: string; symbol: string; confidence: number; ai?: { rationaleJa: string } }) => [
        `${r.date}|${r.symbol}`,
        r,
      ]),
    );

    const state = buildProbeAppState(10, 'bursa-first');
    const apiKeys = await loadAnalysisApiKeys();
    const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
    const newsBySymbol = new Map(
      evidence.symbols.map((s) => [s.symbol.toUpperCase(), s.newsSummaryJa?.trim() || '(なし)'] as const),
    );

    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const details = streaks.map((st) => {
      const bars = barsBySymbol.get(st.symbol)!;
      const closes = bars.map((b) => b.close);
      const idx = bars.findIndex((b) => b.date === st.firstDate);
      const rsi = idx >= 0 ? computeRsi14At(closes, idx) : null;
      const h = hybridByKey.get(`${st.firstDate}|${st.symbol}`) as
        | { confidence: number; ai: { rationaleJa: string } }
        | undefined;
      const ret5 = forwardReturn(st.symbol, st.firstDate, bars, 5);
      const ret10 = forwardReturn(st.symbol, st.firstDate, bars, 10);
      const ret20 = forwardReturn(st.symbol, st.firstDate, bars, 20);
      return {
        symbol: st.symbol,
        startDate: st.firstDate,
        endDate: st.lastDate,
        streakDays: st.rawDayCount,
        startRsi14: rsi,
        startConfidence: h?.confidence ?? null,
        dayChangePctAtStart: dayChangeAt(bars, st.firstDate),
        newsSummaryJa: newsBySymbol.get(st.symbol.toUpperCase()) ?? '(なし)',
        openAiRationaleJa: h?.ai?.rationaleJa ?? hybridByKey.get(`${st.firstDate}|${st.symbol}`) ? (hybridByKey.get(`${st.firstDate}|${st.symbol}`) as { confidence: number }).confidence : null,
        rationaleJa: (hybridByKey.get(`${st.firstDate}|${st.symbol}`) as { ai: { rationaleJa: string } } | undefined)?.ai
          ?.rationaleJa,
        return5d: ret5,
        return10d: ret10,
        return20d: ret20,
      };
    });

    // fix rationale from hybrid row structure
    for (const d of details) {
      const row = hybrid.allRows.find(
        (r: { date: string; symbol: string }) => r.date === d.startDate && r.symbol === d.symbol,
      ) as { confidence: number; ai: { rationaleJa: string } } | undefined;
      if (row) {
        d.startConfidence = row.confidence;
        d.rationaleJa = row.ai?.rationaleJa ?? (row as { rationaleJa?: string }).rationaleJa;
      }
    }

    const judgeHorizon = 10;
    const with10 = details.filter((d) => d.return10d != null);
    const winners = with10.filter((d) => (d.return10d as number) > 0);
    const losers = with10.filter((d) => (d.return10d as number) <= 0);

    const mean = (arr: typeof details, fn: (x: (typeof details)[0]) => number | null) => {
      const vals = arr.map(fn).filter((v): v is number => v != null);
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
    };

    const pattern = {
      primaryHorizonJa: '10営業日後（計測可能4件。VYMは除外）',
      winners: {
        count: winners.length,
        streaks: winners.map((d) => d.symbol + ' ' + d.startDate),
        rsiMean: mean(winners, (d) => d.startRsi14),
        confidenceMean: mean(winners, (d) => d.startConfidence),
        dayChangePctMean: mean(winners, (d) => d.dayChangePctAtStart),
        rationaleKeywords: winners.map((d) => d.rationaleJa),
        newsSummary: winners.map((d) => ({ symbol: d.symbol, news: d.newsSummaryJa.slice(0, 120) })),
      },
      losers: {
        count: losers.length,
        streaks: losers.map((d) => `${d.symbol} ${d.startDate} (${d.return10d}%)`),
        rsiMean: mean(losers, (d) => d.startRsi14),
        confidenceMean: mean(losers, (d) => d.startConfidence),
        dayChangePctMean: mean(losers, (d) => d.dayChangePctAtStart),
        rationaleKeywords: losers.map((d) => d.rationaleJa),
        newsSummary: losers.map((d) => ({ symbol: d.symbol, news: d.newsSummaryJa.slice(0, 120) })),
      },
      alsoAt5d: {
        winners: details.filter((d) => d.return5d != null && d.return5d > 0).map((d) => `${d.symbol} ${d.startDate}`),
        losers: details.filter((d) => d.return5d != null && d.return5d <= 0).map((d) => `${d.symbol} ${d.startDate}`),
      },
      findingsJa: [] as string[],
    };

    if (winners.length === 1 && losers.length === 3) {
      const w = winners[0]!;
      pattern.findingsJa.push(
        `勝ち1件のみ: ${w.symbol} ${w.startDate} — RSI${w.startRsi14}・conf${w.startConfidence}・日中${w.dayChangePctAtStart}%`,
      );
      pattern.findingsJa.push(
        '負け3件はいずれもRSI50前後〜65・confidence70〜75で、勝ちと数値上は大差なし',
      );
      pattern.findingsJa.push(
        'ニュース要約は銘柄テンプレ固定（30日共通）のため勝敗差の説明変数にならない',
      );
      pattern.findingsJa.push(
        'OpenAI根拠文は全件「ポジティブなニュース」系で差が小さい。7103のみRSI高・5d/10d/20dすべてマイナス',
      );
      pattern.findingsJa.push(
        '5dでは1023-4/17のみプラス、10dでも同銘柄のみプラス → 初動2週は上昇後に5〜8月ストリークは逆行',
      );
    }

    const report = { streakDetails: details, winLossAnalysis: pattern };
    const out = path.join(process.cwd(), 'scripts', 'openai-buy-streak-details.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI STREAK DETAILS ===\n', JSON.stringify(report, null, 2));
  });
});
