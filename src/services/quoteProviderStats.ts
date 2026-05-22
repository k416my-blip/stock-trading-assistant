import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import type { QuoteProviderId } from '../types/quoteProvider';

type ProviderStat = { attempts: number; success: number; failures: number };

const stats: Record<QuoteProviderId, ProviderStat> = {
  yahoo_finance: { attempts: 0, success: 0, failures: 0 },
  alpha_vantage: { attempts: 0, success: 0, failures: 0 },
  stooq: { attempts: 0, success: 0, failures: 0 },
  rapidapi_yahoo: { attempts: 0, success: 0, failures: 0 },
  twelve_data: { attempts: 0, success: 0, failures: 0 },
};

export function resetQuoteProviderStats(): void {
  for (const id of Object.keys(stats) as QuoteProviderId[]) {
    stats[id] = { attempts: 0, success: 0, failures: 0 };
  }
}

export function recordProviderAttempt(provider: QuoteProviderId, success: boolean): void {
  const s = stats[provider];
  s.attempts += 1;
  if (success) s.success += 1;
  else s.failures += 1;
}

export function logQuoteProviderSuccessRates(): void {
  const rows = (Object.keys(stats) as QuoteProviderId[]).map((id) => {
    const s = stats[id];
    const rate = s.attempts > 0 ? ((s.success / s.attempts) * 100).toFixed(1) : 'n/a';
    return {
      provider: id,
      label: QUOTE_PROVIDER_LABELS[id],
      attempts: s.attempts,
      success: s.success,
      failures: s.failures,
      successRatePct: rate,
    };
  });
  console.log('[quote-provider] SUCCESS_RATES', rows);
}

export function getQuoteProviderStats(): Readonly<Record<QuoteProviderId, ProviderStat>> {
  return stats;
}
