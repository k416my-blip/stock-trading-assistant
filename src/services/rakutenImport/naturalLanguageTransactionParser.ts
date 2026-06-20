import type { AppState, PortfolioPosition } from '../../types';
import type {
  BrokerTransactionCandidate,
  BrokerTransactionType,
  FieldConfidenceMap,
  ImportFieldKey,
} from '../../types/rakutenImport';
import { CONFIDENCE_FIELD_WARN } from './rakutenImportConfidence';

export type NlParseResult = Pick<
  BrokerTransactionCandidate,
  | 'type'
  | 'executedAt'
  | 'symbol'
  | 'companyName'
  | 'market'
  | 'currency'
  | 'quantity'
  | 'price'
  | 'totalMYR'
  | 'fieldConfidence'
  | 'overallConfidence'
  | 'lowConfidenceFields'
  | 'rawInputText'
>;

type CompanyEntry = {
  symbol: string;
  companyName: string;
  market: 'bursa';
  aliases: RegExp[];
};

/** Aligns with conciergeEvidenceBuilder COMPANY_SYMBOL_MAP + common Bursa names. */
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
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function extractAmount(text: string): number | undefined {
  const rm = text.match(/RM\s*(\d+(?:\.\d+)?)/i);
  if (rm) return parseFloat(rm[1]);
  const ringgit = text.match(/(\d+(?:\.\d+)?)\s*(?:リンギット|ringgit)/i);
  if (ringgit) return parseFloat(ringgit[1]);
  const myr = text.match(/(\d+(?:\.\d+)?)\s*MYR/i);
  if (myr) return parseFloat(myr[1]);
  const leading = text.match(/^(\d+(?:\.\d+)?)\s*(?:RM|MYR)?/i);
  if (leading && /deposit|入金/i.test(text)) return parseFloat(leading[1]);
  return undefined;
}

function extractQuantity(text: string): number | undefined {
  const m = text.match(/(\d+(?:\.\d+)?)\s*株/);
  if (m) return parseFloat(m[1]);
  const en = text.match(/(\d+(?:\.\d+)?)\s*shares?\b/i);
  if (en) return parseFloat(en[1]);
  return undefined;
}

function extractPrice(text: string): number | undefined {
  const de = text.match(/(?:RM\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:リンギット|RM))\s*(?:で|@)/i);
  if (de) return parseFloat(de[1] ?? de[2]);
  const at = text.match(/@\s*RM?\s*(\d+(?:\.\d+)?)/i);
  if (at) return parseFloat(at[1]);
  return undefined;
}

function resolveCompany(text: string): CompanyEntry | undefined {
  for (const entry of COMPANY_ENTRIES) {
    if (entry.aliases.some((re) => re.test(text))) return entry;
  }
  const code = text.match(/\b(\d{4})\b/);
  if (code) {
    return {
      symbol: code[1],
      companyName: code[1],
      market: 'bursa',
      aliases: [],
    };
  }
  return undefined;
}

function holdingQty(
  portfolio: PortfolioPosition[],
  symbol: string,
): number | undefined {
  const pos = portfolio.find(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase() && (p.shares ?? 0) > 0,
  );
  return pos?.shares;
}

function detectType(text: string): BrokerTransactionType | undefined {
  if (/配当|dividend/i.test(text)) return 'dividend';
  if (/入金|deposit|deposited|振込|振り込/i.test(text)) return 'deposit';
  if (/買(?:った|付|い)|購入|bought|\bbuy\b/i.test(text)) return 'buy';
  if (/売(?:った|却|り)|sold|\bsell\b/i.test(text)) return 'sell';
  return undefined;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeLowConfidenceFields(
  fieldConfidence: FieldConfidenceMap,
  required: ImportFieldKey[],
): ImportFieldKey[] {
  const low: ImportFieldKey[] = [];
  for (const field of required) {
    const c = fieldConfidence[field];
    if (c === undefined || c < CONFIDENCE_FIELD_WARN) {
      low.push(field);
    }
  }
  return low;
}

function finalize(
  partial: Omit<NlParseResult, 'overallConfidence' | 'lowConfidenceFields'>,
  required: ImportFieldKey[],
): NlParseResult {
  const confValues = required
    .map((k) => partial.fieldConfidence[k])
    .filter((v): v is number => v !== undefined);
  const overallConfidence = avg(confValues);
  const lowConfidenceFields = computeLowConfidenceFields(
    partial.fieldConfidence,
    required,
  );
  return { ...partial, overallConfidence, lowConfidenceFields };
}

export function parseNaturalLanguageTransaction(
  text: string,
  ctx: { state: AppState },
): NlParseResult | { ok: false; error: string } {
  const rawInputText = normalizeText(text);
  if (!rawInputText) return { ok: false, error: '入力が空です。' };

  const type = detectType(rawInputText);
  if (!type) return { ok: false, error: '取引種別を判別できませんでした。' };

  const executedAt = todayIsoDate();
  const executedAtConf = 0.85;

  if (type === 'deposit') {
    const amount = extractAmount(rawInputText);
    const fieldConfidence: FieldConfidenceMap = {
      type: 0.95,
      currency: 0.95,
      executedAt: executedAtConf,
      total: amount != null ? 0.92 : 0.2,
    };
    return finalize(
      {
        type: 'deposit',
        currency: 'MYR',
        totalMYR: amount,
        executedAt,
        fieldConfidence,
        rawInputText,
      },
      ['type', 'total', 'executedAt', 'currency'],
    );
  }

  if (type === 'dividend') {
    const amount = extractAmount(rawInputText);
    const company = resolveCompany(rawInputText);
    const fieldConfidence: FieldConfidenceMap = {
      type: 0.88,
      executedAt: executedAtConf,
      symbol: company ? 0.75 : 0.25,
      total: amount != null ? 0.7 : 0.2,
    };
    return finalize(
      {
        type: 'dividend',
        currency: 'MYR',
        symbol: company?.symbol,
        companyName: company?.companyName,
        market: company?.market,
        totalMYR: amount,
        executedAt,
        fieldConfidence,
        rawInputText,
      },
      ['type', 'symbol', 'total', 'executedAt'],
    );
  }

  const company = resolveCompany(rawInputText);
  const quantityFromText = extractQuantity(rawInputText);
  const price = extractPrice(rawInputText);
  const portfolio = ctx.state.portfolio ?? [];

  let quantity = quantityFromText;
  let quantityConf = quantityFromText != null ? 0.92 : 0.35;

  if (type === 'sell' && company && quantity == null) {
    const held = holdingQty(portfolio, company.symbol);
    if (held != null && held > 0) {
      quantity = held;
      quantityConf = 0.78;
    }
  }

  const symbolConf = company ? 0.92 : 0.25;
  const priceConf = price != null ? 0.9 : 0.3;
  const typeConf = 0.93;

  const fieldConfidence: FieldConfidenceMap = {
    type: typeConf,
    symbol: symbolConf,
    quantity: quantityConf,
    price: priceConf,
    executedAt: executedAtConf,
    currency: 0.9,
  };

  const required: ImportFieldKey[] =
    type === 'buy' || type === 'sell'
      ? ['type', 'symbol', 'quantity', 'price', 'executedAt']
      : ['type'];

  return finalize(
    {
      type,
      symbol: company?.symbol,
      companyName: company?.companyName,
      market: company?.market ?? (company ? 'bursa' : undefined),
      currency: 'MYR',
      quantity,
      price,
      executedAt,
      fieldConfidence,
      rawInputText,
    },
    required,
  );
}

export function buildConfirmPromptJa(
  candidate: Pick<
    BrokerTransactionCandidate,
    'type' | 'totalMYR' | 'symbol' | 'quantity' | 'price' | 'companyName'
  >,
): string {
  switch (candidate.type) {
    case 'deposit':
      return `RM${candidate.totalMYR?.toLocaleString('ja-JP') ?? '—'}の入金として記録しますか？`;
    case 'buy': {
      const name = candidate.companyName ?? candidate.symbol ?? '銘柄';
      const qty = candidate.quantity != null ? `${candidate.quantity}株` : '';
      const px =
        candidate.price != null ? ` · RM${candidate.price}` : ' · 単価要確認';
      return `${name}を${qty}買付${px}として記録しますか？`;
    }
    case 'sell': {
      const name = candidate.companyName ?? candidate.symbol ?? '銘柄';
      const qty = candidate.quantity != null ? `${candidate.quantity}株` : '';
      const px =
        candidate.price != null ? ` · RM${candidate.price}` : ' · 単価要確認';
      return `${name}を${qty}売却${px}として記録しますか？`;
    }
    case 'dividend':
      return '配当の入金として記録しますか？（銘柄・金額の確認が必要です）';
    default:
      return 'この取引を記録しますか？';
  }
}
