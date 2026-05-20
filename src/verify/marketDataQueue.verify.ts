/**
 * 市場データキュー検証（開発時: npx tsx src/verify/marketDataQueue.verify.ts）
 */
import {
  marketDataRequestQueue,
  enqueueMarketDataRequest,
  MarketDataStaleRequestError,
} from '../services/marketDataRequestQueue';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}`);
  }
}

async function main() {
  let peak = 0;
  let running = 0;

  const tasks = Array.from({ length: 6 }, (_, i) =>
    enqueueMarketDataRequest(`test:${i}`, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 30));
      running -= 1;
      return i;
    }),
  );

  const results = await Promise.all(tasks);
  assert('all tasks complete', results.length === 6);
  assert('max concurrent <= 2', peak <= 2);

  marketDataRequestQueue.noteRateLimit();
  const snap = marketDataRequestQueue.getSnapshot();
  assert('backoff after 429', snap.backoffMs >= 2000);

  marketDataRequestQueue.resetCooldownsForTest();

  let dedupeRuns = 0;
  const dedupePromise = Promise.all([
    enqueueMarketDataRequest('dedupe:A', async () => {
      dedupeRuns += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 'ok';
    }),
    enqueueMarketDataRequest('dedupe:A', async () => {
      dedupeRuns += 1;
      return 'ok2';
    }),
  ]);
  const dedupeResults = await dedupePromise;
  assert('dedupe single run', dedupeRuns === 1);
  assert('dedupe shared result', dedupeResults[0] === dedupeResults[1]);

  marketDataRequestQueue.resetCooldownsForTest();

  let releaseSlow: () => void = () => undefined;
  const slowGate = new Promise<void>((r) => {
    releaseSlow = r;
  });
  let staleRejected = false;
  const slowPromise = enqueueMarketDataRequest('stale:B', async () => {
    await slowGate;
    return 'slow';
  }).catch((e) => {
    if (e instanceof MarketDataStaleRequestError) staleRejected = true;
    return 'cancelled';
  });
  await new Promise((r) => setTimeout(r, 25));
  const fastResult = await enqueueMarketDataRequest('stale:B', async () => 'fast');
  releaseSlow();
  const slowResult = await slowPromise;
  assert('stale request cancelled', staleRejected);
  assert('superseding request succeeds', fastResult === 'fast');
  assert('superseded result discarded', slowResult === 'cancelled');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
