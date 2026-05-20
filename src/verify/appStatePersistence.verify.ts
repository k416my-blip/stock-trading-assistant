/**
 * 永続化チェックサム検証（npx tsx src/verify/appStatePersistence.verify.ts）
 */
import { createDefaultAppState } from '../services/storage';
import {
  computeAppStateIntegrityChecksum,
  verifyPersistedAppStateChecksum,
  wrapAppStateForPersistence,
} from '../services/appStatePersistence';
import { executePracticeTrade, createDefaultPracticeState } from '../services/practice';
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
  const state = createDefaultAppState();
  const envelope = wrapAppStateForPersistence(state);
  assert('envelope version 3', envelope.version === 3);
  assert('checksum verifies', verifyPersistedAppStateChecksum(envelope));

  let practice = createDefaultPracticeState();
  const buy = executePracticeTrade(practice, {
    symbol: '1155',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    shares: 5,
    price: 9.5,
    brokerageFee: 5,
    executedAt: new Date().toISOString(),
  });
  assert('practice buy ok', buy.ok);
  if (buy.ok) {
    practice = buy.practice;
    const withHoldings = {
      ...state,
      practice,
    };
    const sum = computeAppStateIntegrityChecksum(withHoldings);
    const tampered = {
      ...withHoldings,
      practice: { ...withHoldings.practice, portfolio: [] as PortfolioPosition[] },
    };
    assert('checksum changes on wipe', computeAppStateIntegrityChecksum(tampered) !== sum);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
