/**
 * ライブ API プローブ（手動実行）:
 * npx tsx src/verify/quoteProvidersLive.verify.ts
 */
import { BURSA_TEST_YAHOO_SYMBOLS } from '../constants/quoteProviders';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { fetchAlphaVantageQuote } from '../services/quoteProviders/alphaVantageQuote';
import { fetchRapidApiYahooQuote } from '../services/quoteProviders/rapidApiYahooQuote';
import { fetchStooqQuote } from '../services/quoteProviders/stooqQuote';
import { fetchYahooFinanceQuote } from '../services/quoteProviders/yahooFinanceQuote';

type Row = { symbol: string; provider: string; ok: boolean; price?: number; error?: string };

async function tryProvider(
  name: string,
  fn: () => Promise<{ price: number }>,
): Promise<{ ok: boolean; price?: number; error?: string }> {
  try {
    const q = await fn();
    return { ok: true, price: q.price };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (const symbol of BURSA_TEST_YAHOO_SYMBOLS) {
    const providers: Array<[string, () => Promise<{ price: number }>]> = [
      ['yahoo_finance', () => fetchYahooFinanceQuote(symbol, 'MYR', 12_000)],
      ['alpha_vantage', () => fetchAlphaVantageQuote(symbol, 'MYR', 12_000)],
      ['stooq', () => fetchStooqQuote(symbol, 'MYR', 12_000)],
      ['rapidapi_yahoo', () => fetchRapidApiYahooQuote(symbol, 'MYR', 12_000)],
    ];

    for (const [id, fn] of providers) {
      const r = await tryProvider(id, fn);
      rows.push({
        symbol,
        provider: QUOTE_PROVIDER_LABELS[id as keyof typeof QUOTE_PROVIDER_LABELS] ?? id,
        ok: r.ok,
        price: r.price,
        error: r.error,
      });
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  console.log('\n=== Bursa provider live probe ===\n');
  for (const row of rows) {
    console.log(
      `${row.symbol} | ${row.provider} | ${row.ok ? `OK ${row.price}` : `FAIL ${row.error}`}`,
    );
  }

  const byProvider = new Map<string, { ok: number; fail: number }>();
  for (const row of rows) {
    const s = byProvider.get(row.provider) ?? { ok: 0, fail: 0 };
    if (row.ok) s.ok += 1;
    else s.fail += 1;
    byProvider.set(row.provider, s);
  }
  console.log('\n=== Success rates ===');
  for (const [p, s] of byProvider) {
    const total = s.ok + s.fail;
    console.log(`${p}: ${s.ok}/${total} (${total ? ((s.ok / total) * 100).toFixed(0) : 0}%)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
