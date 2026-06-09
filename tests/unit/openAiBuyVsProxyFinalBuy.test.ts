/**
 * OpenAI buy 24 vs プロキシ final buy 16 — 交差分析（APIなし）
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  AUDIT_BUSINESS_DAYS,
  computeRsi14At,
  evaluateSymbolDay,
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import { evaluateOpenAiHybridRow } from '../helpers/openAi30dMeasurement';

describe('OpenAI buy vs proxy final buy intersection', () => {
  it('prints overlap report', async () => {
    const openAiBuy = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    ).allRows as Array<{
      date: string;
      symbol: string;
      confidence: number;
      openAiAction: string;
    }>;

    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const weightPct = 100 / symbols.length;
    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const proxyFinalBuyKeys = new Set<string>();
    const proxyRowsByKey = new Map<string, ReturnType<typeof evaluateSymbolDay>>();
    for (const s of symbols) {
      const bars = barsBySymbol.get(s.symbol)!;
      const closes = bars.map((b) => b.close);
      const window = bars.slice(-AUDIT_BUSINESS_DAYS - 1);
      for (let i = 1; i < window.length; i++) {
        const prev = window[i - 1]!;
        const cur = window[i]!;
        const globalIdx = bars.findIndex((b) => b.date === cur.date);
        const dayChangePct = ((cur.close - prev.close) / prev.close) * 100;
        const rsi14 = computeRsi14At(closes, globalIdx);
        const row = evaluateSymbolDay({
          date: cur.date,
          symbol: s.symbol,
          market: s.market,
          dayChangePct,
          rsi14,
          close: cur.close,
          weightPct,
        });
        const key = `${cur.date}|${s.symbol}`;
        proxyRowsByKey.set(key, row);
        if (row.finalAction === 'buy') proxyFinalBuyKeys.add(key);
      }
    }

    const enriched = openAiBuy.map((o) => {
      const key = `${o.date}|${o.symbol}`;
      const proxy = proxyRowsByKey.get(key);
      const hybrid = evaluateOpenAiHybridRow(
        {
          date: o.date,
          symbol: o.symbol,
          market: symbols.find((s) => s.symbol === o.symbol)!.market,
          dayChangePct: proxy?.dayChangePct ?? 0,
          rsi14: proxy?.rsi14 ?? null,
          close: 0,
          weightPct,
        },
        { action: 'buy', confidence: o.confidence },
      );
      return {
        ...hybrid,
        proxyFinalAction: proxy?.finalAction,
        proxyAiAction: proxy?.aiAction,
        proxyRsi14: proxy?.rsi14,
        inProxyFinalBuySet: proxyFinalBuyKeys.has(key),
      };
    });

    const matchedProxyFinal = enriched.filter((r) => r.inProxyFinalBuySet);
    const openAiOnly = enriched.filter((r) => !r.inProxyFinalBuySet);

    const proxyFinalBuyRows = [...proxyRowsByKey.entries()]
      .filter(([k]) => proxyFinalBuyKeys.has(k))
      .map(([k, proxy]) => {
        const [date, symbol] = k.split('|');
        return {
          date,
          symbol,
          openAiAction: '—',
          confidence: proxy.aiConfidence,
          ruleRaw: proxy.ruleRaw,
          ruleEffective: proxy.ruleEffective,
          finalAction: proxy.finalAction,
          finalScore: proxy.finalScore,
          conflict: proxy.conflict,
          proxyAiAction: proxy.aiAction,
          proxyRsi14: proxy.rsi14,
        };
      });

    const report = {
      openAiBuyCount: enriched.length,
      proxyFinalBuyCountTotal: proxyFinalBuyKeys.size,
      openAiBuyMatchingProxyFinalBuy: matchedProxyFinal.length,
      openAiBuyNotInProxyFinalBuy: openAiOnly.length,
      hybridFinalBuyOnOpenAiBuyRows: enriched.filter((r) => r.finalAction === 'buy').length,
      tallyOpenAiBuyToFinal: {
        hold: enriched.filter((r) => r.finalAction === 'hold').length,
        watch: enriched.filter((r) => r.finalAction === 'watch').length,
        reduce: enriched.filter((r) => r.finalAction === 'reduce').length,
        buy: enriched.filter((r) => r.finalAction === 'buy').length,
      },
      proxyFinalBuyRows,
      openAiBuyRows: enriched,
      matchedRows: matchedProxyFinal,
      openAiOnlyRows: openAiOnly,
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'scripts', 'openai-buy-vs-proxy-final.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );

    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI BUY VS PROXY FINAL ===\n', JSON.stringify(report, null, 2));
  });
});
