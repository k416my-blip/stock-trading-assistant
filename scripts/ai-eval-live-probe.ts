/**
 * 実データ AI 第二評価ログ — npx tsx scripts/ai-eval-live-probe.ts
 */
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

const { buildConciergeEvidenceForProactive } = await import('../src/services/conciergeEvidenceBuilder');
const { fetchAiSecondEvaluatorBatch, resetAiSecondEvaluatorCacheForTest } = await import(
  '../src/services/aiSecondEvaluatorService'
);
const { ruleActionToDirectionScore } = await import('../src/services/hybridStrategyScoreFusion');
const { getActivePortfolio } = await import('../src/services/portfolioPriceUpdate');
const { buildStrategyExecutionBundle } = await import('../src/services/strategyExecutionEngine');
const { defaultStrategyExecutionState } = await import('../src/services/strategyExecutionStorage');
import type { AppState } from '../src/types';

async function loadStateFromProbePath(): Promise<AppState> {
  const probePath =
    process.env.AI_EVAL_APP_STATE_PATH ??
    path.join(process.env.TEMP ?? '/tmp', 'sta-app-state.json');
  const raw = fs.readFileSync(probePath, 'utf8');
  const parsed = JSON.parse(raw) as { state?: AppState } & AppState;
  return parsed.state ?? parsed;
}

const state = await loadStateFromProbePath();
const holdings = getActivePortfolio(state);
console.log(
  '[AI_EVAL_PROBE] holdings',
  holdings.map((h) => `${h.symbol}(${h.market}) x${h.shares}`).join(', '),
);

const evidence = await buildConciergeEvidenceForProactive(
  state,
  {
    newsApiKey: '',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
  },
  'data_driven',
);

const strat = buildStrategyExecutionBundle(
  {
    evidenceSymbols: evidence.symbols,
    globalMarket: null,
    portfolioIntel: null,
    symbolWeightPct: Object.fromEntries(
      evidence.symbols.map((s) => [s.symbol, s.portfolioHolding ? 20 : 5]),
    ),
    tacticalMode: 'balanced',
    regimeId: 'sideways',
  },
  defaultStrategyExecutionState(),
);

const ruleScoresBySymbol: Record<string, number> = {};
for (const r of [...strat.todayRecommendations, ...strat.watchList, ...strat.dangerAvoid]) {
  const sym = r.symbol.toUpperCase();
  if (!ruleScoresBySymbol[sym]) {
    ruleScoresBySymbol[sym] = ruleActionToDirectionScore(r.action, r.confidencePct);
  }
}

resetAiSecondEvaluatorCacheForTest();
await fetchAiSecondEvaluatorBatch(evidence.symbols, {
  force: true,
  degradedMode: false,
  ruleScoresBySymbol,
});
