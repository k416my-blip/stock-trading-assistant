/**
 * ポートフォリオ安定性のシナリオ検証（開発時: npx tsx src/verify/portfolioStability.verify.ts）
 */
import { executePracticeTrade, createDefaultPracticeState } from '../services/practice';
import {
  ensurePortfolioIntegrity,
  mergePortfolioPriceUpdates,
  sanitizePortfolio,
  syncPortfolioPrices,
} from '../services/portfolioPriceUpdate';
import { validatePositionSymbol } from '../services/marketDataValidation';
import {
  isPortfolioRefreshInFlight,
  requestPortfolioPriceRefresh,
  resetPortfolioRefreshCoordinator,
} from '../services/portfolioRefreshCoordinator';
import { computePositionPnL } from '../services/positionValuation';
import { buildHoldingDetails } from '../services/portfolio';
import { isPositionPriceAvailable } from '../services/sellAllHoldings';
import { positionDisplayPrice } from '../utils/positionPrice';
import { resolveDisplayPrice, safeNumber } from '../utils/safeNumeric';
import type { PortfolioPosition } from '../types';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function makePosition(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: 'bursa-1155-test',
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

async function scenario1_buyValidStock() {
  let practice = createDefaultPracticeState();
  const buy = executePracticeTrade(practice, {
    symbol: '1155',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    shares: 10,
    price: 9.8,
    brokerageFee: 8,
    executedAt: new Date().toISOString(),
  });
  assert('1. buy succeeds', buy.ok);
  if (!buy.ok) return;
  practice = buy.practice;
  const holdings = practice.portfolio.filter((p) => p.shares > 0);
  assert('1. one holding exists', holdings.length === 1);
  const price = positionDisplayPrice(holdings[0]);
  assert('1. display price is finite', Number.isFinite(price) && price > 0, String(price));
}

async function scenario2_apiFailureKeepsHolding() {
  const before = [makePosition({ currentPrice: 12.5, averageBuyPrice: 9.5 })];
  const { portfolio: after, result } = await syncPortfolioPrices('invalid-key-on-purpose', before);
  const merged = mergePortfolioPriceUpdates(before, after);
  const safe = ensurePortfolioIntegrity(before, merged);

  assert('2. sync reports failures', result.failures.length > 0);
  assert('2. holding count preserved', safe.length === 1);
  const p = safe[0];
  assert('2. shares preserved', p.shares === 10);
  assert('2. avg price preserved', p.averageBuyPrice === 9.5);
  assert('2. current price not NaN', Number.isFinite(p.currentPrice));
  assert('2. current price kept', p.currentPrice === 12.5);
  assert('2. status failed', p.priceFetchStatus === 'failed');
}

function scenario3_nanGuards() {
  const bad = makePosition({ currentPrice: NaN, averageBuyPrice: 8 });
  const pnl = computePositionPnL(bad);
  assert('3. PnL currentPrice finite', Number.isFinite(pnl.currentPrice));
  assert('3. PnL uses avg fallback', pnl.currentPrice === 8);
  assert('3. PnL value finite', Number.isFinite(pnl.currentValue));

  const display = resolveDisplayPrice({
    currentPrice: undefined,
    averageBuyPrice: 7,
    priceSource: 'manual',
  });
  assert('3. resolveDisplayPrice fallback', display === 7);
}

function scenario4_uiLabels() {
  const manual = makePosition({ priceSource: 'manual', currentPrice: 11 });
  const stale = makePosition({ priceFetchStatus: 'failed', currentPrice: 10, priceSource: 'api' });
  const none = makePosition({ currentPrice: 0, averageBuyPrice: 0 });

  const manualDetails = buildHoldingDetails([manual], 1000);
  const staleDetails = buildHoldingDetails([stale], 1000);
  const noneDetails = buildHoldingDetails([none], 0);

  assert('4. manual has price', manualDetails[0]?.priceAvailable === true);
  assert('4. manual label', manualDetails[0]?.priceStatusLabel === '手動価格');
  assert('4. stale has price', staleDetails[0]?.priceAvailable === true);
  assert('4. stale label', staleDetails[0]?.priceStatusLabel === '前回取得価格');
  assert('4. no price unavailable', noneDetails[0]?.priceAvailable === false);
}

function scenario5_sellWithFallback() {
  const pos = makePosition({ priceFetchStatus: 'failed', currentPrice: 10.5 });
  assert('5. sell price available', isPositionPriceAvailable(pos));
  assert('5. sell uses fallback', positionDisplayPrice(pos) === 10.5);
}

async function scenario6_refreshCoordinator() {
  resetPortfolioRefreshCoordinator();
  let runs = 0;
  const exec = async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 50));
    return { ok: true, updatedCount: 0, failures: [], marketClosedHint: false };
  };

  const p1 = requestPortfolioPriceRefresh(exec, { silent: true, debounceMs: 10 });
  const p2 = requestPortfolioPriceRefresh(exec, { silent: true, debounceMs: 10 });
  assert('6. concurrent shares promise', p1 === p2);
  await p1;
  assert('6. single execution', runs === 1);
  assert('6. not in flight after', !isPortfolioRefreshInFlight());
}

function scenario7_invalidTickerSkipped() {
  const v1 = validatePositionSymbol('bursa', '');
  const v2 = validatePositionSymbol('bursa', 'マレーシア銀行');
  const v3 = validatePositionSymbol('us', 'AAPL');
  assert('7. empty invalid', !v1.ok);
  assert('7. name invalid', !v2.ok);
  assert('7. AAPL valid', v3.ok);
}

function scenario8_sanitizeNeverDropsShares() {
  const corrupted = makePosition({ shares: NaN as unknown as number, currentPrice: NaN });
  const clean = sanitizePortfolio([corrupted])[0];
  assert('8. shares safe', safeNumber(clean.shares, -1) >= 0);
  assert('8. price uses avg', clean.currentPrice === clean.averageBuyPrice);
}

async function main() {
  console.log('Portfolio stability verification\n');
  await scenario1_buyValidStock();
  await scenario2_apiFailureKeepsHolding();
  scenario3_nanGuards();
  scenario4_uiLabels();
  scenario5_sellWithFallback();
  await scenario6_refreshCoordinator();
  scenario7_invalidTickerSkipped();
  scenario8_sanitizeNeverDropsShares();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
