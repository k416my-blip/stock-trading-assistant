/**
 * ステールデータメタデータ検証（npx tsx src/verify/staleDataMetadata.verify.ts）
 */
import { STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import { computeQuoteStaleMetadata } from '../services/staleDataMetadata';
import { applyStaleDataConfidencePenalty, staleFractionFromFlags } from '../services/staleDataConfidence';
import { portfolioDataConfidence } from '../services/normalizedMarketData';
import type { PortfolioPosition } from '../types';

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

function main() {
  const now = new Date().toISOString();
  const old = new Date(Date.now() - STALE_QUOTE_MAX_AGE_MS - 60_000).toISOString();

  const fresh = computeQuoteStaleMetadata(now, now);
  assert('fresh not stale', fresh.isStale === false);
  assert('fresh age small', fresh.quoteAgeMs < 1000);
  assert('quoteAgeSeconds matches ms', fresh.quoteAgeSeconds === Math.floor(fresh.quoteAgeMs / 1000));

  const stale = computeQuoteStaleMetadata(old, old);
  assert('old is stale', stale.isStale === true);
  assert('tracks lastSuccessfulFetch', stale.lastSuccessfulFetchAt === old);

  const penaltyNone = applyStaleDataConfidencePenalty(1, 0);
  const penaltyAll = applyStaleDataConfidencePenalty(1, 1);
  assert('no penalty when fresh', penaltyNone === 1);
  assert('penalty when all stale', penaltyAll < 1 && penaltyAll >= 0.15);

  assert('stale fraction half', staleFractionFromFlags([true, false]) === 0.5);

  const holdings: PortfolioPosition[] = [
    {
      id: 'a',
      symbol: 'AAPL',
      market: 'us',
      currency: 'USD',
      shares: 1,
      averageBuyPrice: 100,
      currentPrice: 100,
      isStale: true,
      priceFetchStatus: 'failed',
      openedAt: now,
    },
  ];
  assert('portfolio confidence reduced', portfolioDataConfidence(holdings) < 1);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
