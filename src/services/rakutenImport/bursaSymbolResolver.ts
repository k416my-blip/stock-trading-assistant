import type { Market } from '../../types';

export type ResolvedBursaSymbol = {
  symbol: string;
  companyName: string;
  market: Market;
};

type CompanyEntry = {
  symbol: string;
  companyName: string;
  market: 'bursa';
  aliases: RegExp[];
};

/** Aligns with naturalLanguageTransactionParser company map. */
const COMPANY_ENTRIES: CompanyEntry[] = [
  {
    symbol: '1155',
    companyName: 'Malayan Banking',
    market: 'bursa',
    aliases: [/maybank/i, /マレー銀行/, /malayan banking/i],
  },
  {
    symbol: '1023',
    companyName: 'CIMB Group Holdings',
    market: 'bursa',
    aliases: [/\bcimb\b/i, /シンバ/, /cimb group/i],
  },
  {
    symbol: '1295',
    companyName: 'Public Bank',
    market: 'bursa',
    aliases: [/public bank/i, /パブリック銀行/],
  },
  {
    symbol: '4707',
    companyName: 'Nestle Malaysia',
    market: 'bursa',
    aliases: [/nestle/i, /ネスレ/],
  },
  {
    symbol: '5347',
    companyName: 'Tenaga Nasional',
    market: 'bursa',
    aliases: [/tenaga/i, /テナガ/],
  },
  {
    symbol: '6033',
    companyName: 'Petronas Gas',
    market: 'bursa',
    aliases: [/petronas gas/i, /ペトロナス/],
  },
];

function fromFourDigitCode(text: string): ResolvedBursaSymbol | undefined {
  const code = text.match(/\b(\d{4})\b/);
  if (!code) return undefined;
  const entry = COMPANY_ENTRIES.find((e) => e.symbol === code[1]);
  if (entry) {
    return { symbol: entry.symbol, companyName: entry.companyName, market: entry.market };
  }
  return { symbol: code[1], companyName: code[1], market: 'bursa' };
}

/** Resolve Bursa symbol from OCR/NL company name or 4-digit code. */
export function resolveBursaSymbol(
  symbol?: string,
  company?: string,
): ResolvedBursaSymbol | undefined {
  const sym = symbol?.trim();
  if (sym && /^\d{4}$/.test(sym)) {
    const entry = COMPANY_ENTRIES.find((e) => e.symbol === sym);
    return entry
      ? { symbol: entry.symbol, companyName: entry.companyName, market: entry.market }
      : { symbol: sym, companyName: company?.trim() || sym, market: 'bursa' };
  }

  const haystack = `${company ?? ''} ${symbol ?? ''}`.trim();
  if (!haystack) return undefined;

  for (const entry of COMPANY_ENTRIES) {
    if (entry.aliases.some((re) => re.test(haystack))) {
      return { symbol: entry.symbol, companyName: entry.companyName, market: entry.market };
    }
  }

  return fromFourDigitCode(haystack);
}
