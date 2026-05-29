/**
 * 実運用ログ・重複防止のスモーク（Metro相当の console 出力を検証）
 */
import {
  getPortfolioRefreshCoordinatorSnapshot,
  requestPortfolioPriceRefresh,
  resetPortfolioRefreshCoordinator,
} from '../services/portfolioRefreshCoordinator';
import {
  enqueueMarketDataRequest,
  marketDataRequestQueue,
} from '../services/marketDataService';

const logs: string[] = [];
const orig = console.log;
console.log = (...args: unknown[]) => {
  const line = args.map(String).join(' ');
  logs.push(line);
  orig(...args);
};

function hasTag(tag: string): boolean {
  return logs.some((l) => l.includes(tag));
}

async function main() {
  resetPortfolioRefreshCoordinator();

  let runs = 0;
  const exec = async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 30));
    return {
      ok: true,
      updatedCount: 0,
      failures: [],
      marketClosedHint: false,
      successCount: 0,
      failedCount: 0,
      partialFailure: false,
      totalFailure: false,
    };
  };

  const p1 = requestPortfolioPriceRefresh(exec, {
    silent: false,
    trigger: 'manual',
  });
  const p2 = requestPortfolioPriceRefresh(exec, {
    silent: false,
    trigger: 'manual',
  });
  if (p1 !== p2) throw new Error('manual duplicate should share inFlight promise');
  await p1;
  if (runs !== 1) throw new Error(`expected 1 run, got ${runs}`);
  if (!hasTag('[PRICE FETCH DUPLICATE BLOCKED]')) {
    throw new Error('missing DUPLICATE BLOCKED log');
  }

  resetPortfolioRefreshCoordinator();
  logs.length = 0;

  requestPortfolioPriceRefresh(exec, { silent: true, debounceMs: 5, trigger: 'auto' });
  requestPortfolioPriceRefresh(exec, { silent: true, debounceMs: 5, trigger: 'auto' });
  await new Promise((r) => setTimeout(r, 80));
  if (!hasTag('[AUTO UPDATE SKIPPED]') && !hasTag('[PRICE FETCH DUPLICATE BLOCKED]')) {
    throw new Error('expected silent throttle or duplicate block');
  }

  marketDataRequestQueue.resetCooldownsForTest();
  logs.length = 0;

  const key = 'verify:ops:AAPL';
  const pA = enqueueMarketDataRequest(key, async () => {
    await new Promise((r) => setTimeout(r, 80));
    return 'a';
  });
  const pB = enqueueMarketDataRequest(key, async () => 'b');
  await Promise.all([pA, pB]);
  await new Promise((r) => setTimeout(r, 20));
  if (!hasTag('[QUEUE ACTIVE]')) throw new Error('missing QUEUE ACTIVE');
  if (!hasTag('[QUEUE FINISHED]')) throw new Error('missing QUEUE FINISHED');
  if (!hasTag('[PRICE FETCH DUPLICATE BLOCKED]')) {
    throw new Error('missing queue dedupe log');
  }

  const snap = getPortfolioRefreshCoordinatorSnapshot();
  console.log = orig;
  console.log('[productionOps.verify] OK', {
    coordinator: snap,
    logSample: logs.filter((l) => l.startsWith('[')).slice(-8),
  });
}

main().catch((e) => {
  console.log = orig;
  console.error('[productionOps.verify] FAIL', e);
  process.exit(1);
});
