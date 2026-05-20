/**
 * ポートフォリオスナップショット検証（開発時: npx tsx src/verify/portfolioSnapshot.verify.ts）
 */
import {
  computePortfolioChecksum,
  isHealthyPortfolio,
  isMalformedPortfolioSync,
  rollbackPortfolioSync,
  verifyPortfolioChecksum,
} from '../services/portfolioSnapshot';
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

function pos(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: 't1',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    shares: 10,
    averageBuyPrice: 100,
    currentPrice: 110,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

function main() {
  const healthy = [pos()];
  const checksum = computePortfolioChecksum(healthy);
  assert('healthy portfolio', isHealthyPortfolio(healthy));
  assert('checksum verifies', verifyPortfolioChecksum(healthy, checksum));

  const empty: PortfolioPosition[] = [];
  const malformed = rollbackPortfolioSync(healthy, empty);
  assert('rollback empty overwrite', malformed.length === 1);
  assert('malformed detected', isMalformedPortfolioSync(healthy, empty));

  const noShares = [pos({ shares: 0 })];
  assert('unhealthy zero shares', !isHealthyPortfolio(noShares));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
