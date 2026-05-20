/**
 * ポートフォリオ復旧・チェックサム検証（npx tsx src/verify/portfolioRecovery.verify.ts）
 */
import {
  computePortfolioChecksum,
  isMalformedPortfolioSync,
  isPortfolioStructurallyCorrupt,
  rollbackPortfolioSync,
  verifyPortfolioChecksum,
} from '../services/portfolioSnapshot';
import { rejectEmptyPortfolioReplace } from '../services/portfolioPersistenceGuard';
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
    ...overrides,
  };
}

function main() {
  const healthy = [pos()];
  const checksum = computePortfolioChecksum(healthy);
  assert('checksum stable', verifyPortfolioChecksum(healthy, checksum));

  const empty: PortfolioPosition[] = [];
  assert('empty replace blocked', rejectEmptyPortfolioReplace(healthy, empty) === healthy);

  const malformed = [pos({ shares: 0 })];
  assert('malformed sync detected', isMalformedPortfolioSync(healthy, malformed));
  assert('rollback keeps baseline', rollbackPortfolioSync(healthy, malformed) === healthy);

  const dup = [pos(), pos({ id: 'bursa-1155' })];
  assert('dup id corrupt', isPortfolioStructurallyCorrupt(dup));

  const emptySym = [pos({ symbol: '' })];
  assert('empty symbol corrupt', isPortfolioStructurallyCorrupt(emptySym));

  const badPrice = [pos({ currentPrice: Number.NaN })];
  assert('invalid price rollback', rollbackPortfolioSync(healthy, badPrice) === healthy);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
