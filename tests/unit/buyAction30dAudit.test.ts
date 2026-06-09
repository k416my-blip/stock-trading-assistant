/**
 * 30営業日 buy 監査 — CSV / 集計 / バックテスト出力
 * npx vitest run tests/unit/buyAction30dAudit.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  AUDIT_BUSINESS_DAYS,
  BUY_CONDITIONS_DOC,
  aggregateBottlenecks,
  buildConflictBlockers,
  countActions,
  evaluateSymbolDay,
  fetchYahooDailyBars,
  computeRsi14At,
  runSimpleBuyBacktest,
  rowsToCsv,
  toYahooSymbol,
  type DailyBar,
  type EvalRow,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';

const OUT_DIR = path.join(process.cwd(), 'agent-tools');

describe('buy action 30d audit', () => {
  it('aggregates 30 business days, writes CSV and backtest report', async () => {
    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));

    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      const bars = await fetchYahooDailyBars(s.yahooSymbol);
      expect(bars.length).toBeGreaterThan(20);
      barsBySymbol.set(s.symbol, bars);
    }

    const weightPct = 100 / symbols.length;
    const allRows: EvalRow[] = [];

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
        allRows.push(
          evaluateSymbolDay({
            date: cur.date,
            symbol: s.symbol,
            market: s.market,
            dayChangePct,
            rsi14,
            close: cur.close,
            weightPct,
          }),
        );
      }
    }

    const finalCounts = countActions(allRows, 'finalAction');
    const aiCounts = countActions(allRows, 'aiAction');
    const ruleCounts = countActions(allRows, 'ruleEffective');
    const bottlenecks = aggregateBottlenecks(allRows);
    const blockers = buildConflictBlockers(allRows);

    const backtests = [
      runSimpleBuyBacktest(allRows, barsBySymbol, (r) => r.finalAction === 'buy', 'finalAction=buy'),
      runSimpleBuyBacktest(
        allRows,
        barsBySymbol,
        (r) => r.ruleEffective === 'buy' && r.aiAction === 'buy' && !r.conflict,
        'rule+ai buy, no conflict',
      ),
      runSimpleBuyBacktest(allRows, barsBySymbol, (r) => r.aiAction === 'buy', 'aiAction=buy (proxy)'),
      runSimpleBuyBacktest(allRows, barsBySymbol, (r) => r.ruleEffective === 'buy', 'ruleEffective=buy'),
    ];

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'buy-action-30d-per-symbol.csv'), rowsToCsv(allRows), 'utf8');

    const report = {
      generatedAt: new Date().toISOString(),
      businessDays: AUDIT_BUSINESS_DAYS,
      symbolCount: symbols.length,
      observationCount: allRows.length,
      noteJa:
        'AIはOpenAI未再実行。RSIヒューリスティック（portfolioAiEvaluationBuilder フォールバック）で30日×銘柄を再現。日中変化率は日次終値リターンで近似。',
      actionCounts: { final: finalCounts, aiProxy: aiCounts, rule: ruleCounts },
      bottlenecks,
      conflictBlockers: blockers,
      backtests,
      buyConditions: BUY_CONDITIONS_DOC,
    };

    fs.writeFileSync(
      path.join(OUT_DIR, 'buy-action-30d-report.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );

    const md = `# Buy action 30営業日監査

- 観測: ${allRows.length} 件（${symbols.length}銘柄 × ${AUDIT_BUSINESS_DAYS}営業日）
- ${report.noteJa}

## 1. アクション件数

| 区分 | buy | hold | watch | reduce |
|------|-----|------|-------|--------|
| **finalAction** | ${finalCounts.buy} | ${finalCounts.hold} | ${finalCounts.watch} | ${finalCounts.reduce} |
| **aiProxy** | ${aiCounts.buy} | ${aiCounts.hold} | ${aiCounts.watch} | ${aiCounts.reduce} |
| **ruleEffective** | ${ruleCounts.buy} | ${ruleCounts.hold} | ${ruleCounts.watch} | ${ruleCounts.reduce} |

## 2. ルールボトルネック（ruleMatched）

${bottlenecks.map((b) => `- **${b.ruleName}**: ${b.matchCount} (${b.pct}%)`).join('\n')}

## 3. buy が少ない要因

- rule buy: ${blockers.ruleBuyCount} / ai buy (proxy): ${blockers.aiBuyCount} / final buy: ${blockers.finalBuyCount}
- AI buy → conflict で watch 降格: **${blockers.demotedToWatch}** 件

## 4. buy 条件一覧

${BUY_CONDITIONS_DOC}

## 5. 簡易バックテスト（シグナル翌日終値→${5}営業日後終値）

${backtests
  .map(
    (b) =>
      `### ${b.label}\n- シグナル数: ${b.signalCount}\n- 勝率: ${b.winRatePct}%\n- 平均騰落: ${b.avgReturnPct}%\n- 最大損失: ${b.maxLossPct}%`,
  )
  .join('\n\n')}

## 6. CSV

\`agent-tools/buy-action-30d-per-symbol.csv\`
`;

    fs.writeFileSync(path.join(OUT_DIR, 'buy-action-30d-report.md'), md, 'utf8');

    // eslint-disable-next-line no-console
    console.log('\n=== buy 30d audit ===\n', JSON.stringify(report, null, 2));

    expect(allRows.length).toBeGreaterThan(0);
  }, 120_000);
});
