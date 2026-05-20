/**
 * 市場データエラー分類の検証（API不要）
 * npm run verify:market-data
 */
import assert from 'node:assert/strict';
import { BURSA_FORMAT_FAILURE_THRESHOLD } from '../constants/marketData';
import {
  getBursaQuoteAttempts,
  getSymbolCacheEntry,
  isBursaFormatCacheExpired,
  normalizeBursaCoreSymbol,
  recordBursaCachedFormatFailure,
  recordBursaFormatSuccess,
  resetBursaFormatPreference,
  resolveBursaProbeMode,
  setPreferredBursaFormatForTests,
  setSymbolCacheForTests,
} from '../services/bursaSymbolFormat';
import { classifyMarketDataError, toUserFriendlyPriceError } from '../services/marketDataErrors';
import { probeErrorFromMarketData, QuoteProbeSession } from '../services/marketDataProbe';
import { isValidQuotePrice } from '../utils/safeNumeric';

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function main(): Promise<void> {
console.log('market-data error classification');

await test('429 → rate_limit', () => {
  assert.equal(classifyMarketDataError('Too many requests', 429), 'rate_limit');
});

await test('generic "limit" alone → unknown (not rate_limit)', () => {
  assert.equal(classifyMarketDataError('request limit exceeded for user'), 'unknown');
});

await test('symbol not found → symbol_invalid', () => {
  assert.equal(classifyMarketDataError('Symbol not found: XYZ'), 'symbol_invalid');
});

await test('unsupported exchange → unsupported_exchange', () => {
  assert.equal(
    classifyMarketDataError('Exchange BURSA is not supported'),
    'unsupported_exchange',
  );
});

await test('market closed → market_closed', () => {
  assert.equal(classifyMarketDataError('Market is closed'), 'market_closed');
});

await test('network → network_timeout', () => {
  assert.equal(classifyMarketDataError('Network request failed'), 'network_timeout');
});

await test('5xx → server_error', () => {
  assert.equal(classifyMarketDataError('Internal Server Error', 503), 'server_error');
});

await test('empty price message → empty_response', () => {
  assert.equal(
    classifyMarketDataError('株価データを読み取れませんでした（price/close/previous_close が空）'),
    'empty_response',
  );
});

await test('apikey in body with code 401 → api_key', () => {
  assert.equal(
    classifyMarketDataError('**apikey** parameter is incorrect', 401),
    'api_key',
  );
});

console.log('\nQuote price validation');

await test('isValidQuotePrice rejects 0, NaN, negative', () => {
  assert.equal(isValidQuotePrice(0), false);
  assert.equal(isValidQuotePrice(-1), false);
  assert.equal(isValidQuotePrice(Number.NaN), false);
  assert.equal(isValidQuotePrice(Number.POSITIVE_INFINITY), false);
  assert.equal(isValidQuotePrice(1.23), true);
});

console.log('\nQuote probe abort');

await test('probe aborts on api_key', () => {
  const probe = new QuoteProbeSession();
  probe.noteFailure(
    probeErrorFromMarketData({
      kind: 'api_key',
      message: 'APIキー',
      rawMessage: 'invalid apikey',
    }),
  );
  assert.equal(probe.shouldAbort(), true);
});

await test('probe aborts after 2 timeouts', () => {
  const probe = new QuoteProbeSession();
  const err = probeErrorFromMarketData({
    kind: 'network_timeout',
    message: 'timeout',
    rawMessage: 'timed out',
  });
  probe.noteFailure(err);
  assert.equal(probe.shouldAbort(), false);
  probe.noteFailure(err);
  assert.equal(probe.shouldAbort(), true);
});

await test('probe aborts immediately on offline pattern', () => {
  const probe = new QuoteProbeSession();
  probe.noteFailure(
    probeErrorFromMarketData({
      kind: 'network_timeout',
      message: 'network',
      rawMessage: 'Network request failed',
    }),
  );
  assert.equal(probe.shouldAbort(), true);
});

console.log('\nBursa symbol normalization');

await test('5347 → core 5347', () => {
  assert.equal(normalizeBursaCoreSymbol('5347'), '5347');
});

await test('5347.KL → core 5347', () => {
  assert.equal(normalizeBursaCoreSymbol('5347.KL'), '5347');
});

await test('KLSE:5347 → core 5347', () => {
  assert.equal(normalizeBursaCoreSymbol('KLSE:5347'), '5347');
});

await test('BURSA:5347 → core 5347', () => {
  assert.equal(normalizeBursaCoreSymbol('BURSA:5347'), '5347');
});

await test('no cache: full probe lists 7 attempts', () => {
  resetBursaFormatPreference();
  const attempts = getBursaQuoteAttempts('5347', { mode: 'full' });
  assert.equal(attempts.length, 7);
});

await test('cached format: cached-only returns 1 attempt', () => {
  resetBursaFormatPreference();
  setPreferredBursaFormatForTests('dotkl-xkls');
  const attempts = getBursaQuoteAttempts('5347', { mode: 'cached-only' });
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.attempt, '5347.KL-xkls');
});

await test('cached format: full mode still has 7 with preferred first', () => {
  setPreferredBursaFormatForTests('numeric-xkls');
  const attempts = getBursaQuoteAttempts('5347', { mode: 'full' });
  assert.equal(attempts.length, 7);
  assert.equal(attempts[0]?.formatId, 'numeric-xkls');
});

await test('toUserFriendlyPriceError does not map unrelated errors to rate limit', () => {
  const msg = toUserFriendlyPriceError('connection reset');
  assert.ok(!msg.includes('API制限'));
});

console.log('\nBursa cache self-healing');

await test('single format failure keeps cached-only mode', async () => {
  resetBursaFormatPreference();
  setSymbolCacheForTests('5347', {
    winningFormat: 'dotkl-xkls',
    lastSuccessAt: new Date().toISOString(),
    consecutiveFailures: 0,
  });
  const r = await recordBursaCachedFormatFailure('5347', 'symbol_invalid');
  assert.equal(r.consecutiveFailures, 1);
  assert.equal(r.shouldExpandToFull, false);
  assert.equal(resolveBursaProbeMode('5347'), 'cached-only');
});

await test('threshold failures trigger full probe expansion', async () => {
  resetBursaFormatPreference();
  setSymbolCacheForTests('5347', {
    winningFormat: 'dotkl-xkls',
    lastSuccessAt: new Date().toISOString(),
    consecutiveFailures: BURSA_FORMAT_FAILURE_THRESHOLD - 1,
  });
  const r = await recordBursaCachedFormatFailure('5347', 'symbol_invalid');
  assert.equal(r.consecutiveFailures, BURSA_FORMAT_FAILURE_THRESHOLD);
  assert.equal(r.shouldExpandToFull, true);
  assert.equal(resolveBursaProbeMode('5347'), 'full');
});

await test('success resets consecutiveFailures', async () => {
  resetBursaFormatPreference();
  setSymbolCacheForTests('5347', {
    winningFormat: 'numeric-xkls',
    lastSuccessAt: new Date().toISOString(),
    consecutiveFailures: 2,
  });
  await recordBursaFormatSuccess('5347', 'dotkl-xkls', '5347.KL-xkls');
  const entry = getSymbolCacheEntry('5347');
  assert.equal(entry?.consecutiveFailures, 0);
  assert.equal(entry?.winningFormat, 'dotkl-xkls');
});

await test('expired cache forces full revalidation', () => {
  resetBursaFormatPreference();
  const old = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  setSymbolCacheForTests('5347', {
    winningFormat: 'dotkl-xkls',
    lastSuccessAt: old,
    consecutiveFailures: 0,
  });
  const entry = getSymbolCacheEntry('5347')!;
  assert.equal(isBursaFormatCacheExpired(entry), true);
  assert.equal(resolveBursaProbeMode('5347'), 'full');
});

await test('non-format errors do not increment failure counter', async () => {
  resetBursaFormatPreference();
  setSymbolCacheForTests('5347', {
    winningFormat: 'dotkl-xkls',
    lastSuccessAt: new Date().toISOString(),
    consecutiveFailures: 0,
  });
  const r = await recordBursaCachedFormatFailure('5347', 'rate_limit');
  assert.equal(r.consecutiveFailures, 0);
  assert.equal(r.shouldExpandToFull, false);
  assert.equal(getSymbolCacheEntry('5347')?.consecutiveFailures, 0);
});

console.log('\nAll market-data verification passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
