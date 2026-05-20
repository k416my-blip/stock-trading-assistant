/**
 * ポートフォリオトランザクション検証（npx tsx src/verify/portfolioTransaction.verify.ts）
 */
import { createDefaultAppState } from '../services/storage';
import { applyPriceRefreshTransaction } from '../services/portfolioTransaction';
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

function pos(): PortfolioPosition {
  return {
    id: 'bursa-1155',
    symbol: '1155',
    market: 'bursa',
    currency: 'MYR',
    shares: 10,
    averageBuyPrice: 9.5,
    currentPrice: 10,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    openedAt: new Date().toISOString(),
  };
}

function main() {
  const state = createDefaultAppState();
  const holding = pos();
  const withHolding = { ...state, portfolio: [holding] };

  const emptySync: PortfolioPosition[] = [];
  const after = applyPriceRefreshTransaction(withHolding, 'manual', emptySync);
  assert('empty sync keeps holdings', after.portfolio.length === 1);
  assert('shares preserved', after.portfolio[0]?.shares === 10);

  const badSync = [
    {
      ...holding,
      currentPrice: Number.NaN,
      priceFetchStatus: 'ok' as const,
    },
  ];
  const rolled = applyPriceRefreshTransaction(withHolding, 'manual', badSync);
  assert('malformed price rollback', rolled.portfolio[0]?.currentPrice === 10);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
