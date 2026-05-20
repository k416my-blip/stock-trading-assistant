import type { ConciergeEntityMemory } from '../types/aiConciergeSession';

const TICKER_PATTERNS: RegExp[] = [
  /\b\d{4}\b/g,
  /\bAAPL\b/gi,
  /\bMSFT\b/gi,
  /\bGOOGL\b/gi,
  /\bGOOG\b/gi,
  /\bAMZN\b/gi,
  /\bMETA\b/gi,
  /\bNVDA\b/gi,
  /\bAMD\b/gi,
  /\bTSM\b/gi,
  /\bAVGO\b/gi,
  /\bTSLA\b/gi,
];

const COMPANY_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /NVIDIA|エヌビディア/gi, name: 'NVIDIA' },
  { pattern: /Microsoft|マイクロソフト/gi, name: 'Microsoft' },
  { pattern: /Alphabet|Google|グーグル/gi, name: 'Alphabet' },
  { pattern: /Amazon|アマゾン/gi, name: 'Amazon' },
  { pattern: /Meta|メタ/gi, name: 'Meta' },
  { pattern: /AMD/gi, name: 'AMD' },
  { pattern: /TSMC|台湾積体電路/gi, name: 'TSMC' },
  { pattern: /Broadcom|ブロードコム/gi, name: 'Broadcom' },
  { pattern: /マレー銀行|Maybank/gi, name: 'マレー銀行' },
  { pattern: /OpenAI/gi, name: 'OpenAI' },
];

const SECTOR_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /半導体|チップ|GPU|AIインフラ/gi, name: '半導体' },
  { pattern: /銀行|金融/gi, name: '銀行' },
  { pattern: /クラウド|ハイパースケーラー/gi, name: 'クラウド' },
  { pattern: /ソフトウェア|SaaS/gi, name: 'ソフトウェア' },
];

const COUNTRY_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /マレーシア|Bursa|ブルサ/gi, name: 'マレーシア' },
  { pattern: /米国|アメリカ/gi, name: '米国' },
  { pattern: /台湾/gi, name: '台湾' },
  { pattern: /日本/gi, name: '日本' },
];

export function userRequestsNamedEntities(message: string): boolean {
  const t = message.trim();
  return /会社名|企業名|銘柄名|具体名|具体的に|例えば|どの会社|どの企業|どの銘柄|名前を|名称|リストアップ|挙げて|教えて.*(会社|銘柄)|注目.*(会社|企業)|競合|ライバル|推奨.*(銘柄|株)|テーマ.*(銘柄|株)|セクター.*(銘柄|例)|銘柄.*(例|教え)/i.test(
    t,
  );
}

export function userWantsElaboration(message: string): boolean {
  const t = message.trim();
  return /具体的に|具体例|例えば|どういう意味|もう少し詳しく|詳しく教えて|名前は|どれ|どんな会社/i.test(
    t,
  );
}

export function extractEntitiesFromText(text: string): ConciergeEntityMemory {
  const tickers = new Set<string>();
  for (const re of TICKER_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const raw = match[0];
      tickers.add(/^\d{4}$/.test(raw) ? raw : raw.toUpperCase());
    }
  }

  const companyNames = new Set<string>();
  for (const { pattern, name } of COMPANY_PATTERNS) {
    if (pattern.test(text)) companyNames.add(name);
  }

  const sectors = new Set<string>();
  for (const { pattern, name } of SECTOR_PATTERNS) {
    if (pattern.test(text)) sectors.add(name);
  }

  const countries = new Set<string>();
  for (const { pattern, name } of COUNTRY_PATTERNS) {
    if (pattern.test(text)) countries.add(name);
  }

  return {
    tickers: [...tickers],
    companyNames: [...companyNames],
    sectors: [...sectors],
    countries: [...countries],
  };
}

export function mergeEntityMemory(
  prev: ConciergeEntityMemory,
  extracted: ConciergeEntityMemory,
  maxEach = 10,
): ConciergeEntityMemory {
  const uniq = (a: string[], b: string[]) => [...new Set([...a, ...b])].slice(-maxEach);
  return {
    tickers: uniq(prev.tickers, extracted.tickers),
    companyNames: uniq(prev.companyNames, extracted.companyNames),
    sectors: uniq(prev.sectors, extracted.sectors),
    countries: uniq(prev.countries, extracted.countries),
  };
}

export function buildAnswerQualityHintJa(input: {
  userMessage: string;
  requestsNamedEntities: boolean;
  wantsElaboration: boolean;
  entities: ConciergeEntityMemory;
  lastAssistantSnippet: string | null;
}): string {
  const parts: string[] = [];
  if (input.requestsNamedEntities) {
    parts.push('この質問は具体名（企業・銘柄・国・セクター）の列挙を最優先する。カテゴリだけで終えない。');
  }
  if (input.wantsElaboration) {
    parts.push('具体化・例示モード: 直前の話題を固有名詞で展開する。');
  }
  if (input.entities.companyNames.length > 0) {
    parts.push(`会話で出た企業: ${input.entities.companyNames.join('、')}`);
  }
  if (input.entities.tickers.length > 0) {
    parts.push(`会話で出た銘柄: ${input.entities.tickers.join('、')}`);
  }
  if (input.lastAssistantSnippet) {
    parts.push(`直前の回答（繰り返し禁止）: ${input.lastAssistantSnippet.slice(0, 120)}`);
  }
  return parts.join(' ');
}

/** Detect answers that are only broad categories without named entities. */
export function isVagueCategoryOnlyAnswer(text: string, userAskedForNames: boolean): boolean {
  if (!userAskedForNames) return false;
  const t = text.trim();
  const hasNamed =
    /\b\d{4}\b/.test(t) ||
    /NVIDIA|Microsoft|Alphabet|Amazon|Meta|AMD|TSMC|Broadcom|OpenAI|マレー銀行/i.test(t) ||
    /\([A-Z]{2,5}\)/.test(t);
  if (hasNamed) return false;
  return /半導体関連|半導体セクター|大型銀行|テック関連|AI関連です|銀行株|様子見/i.test(t);
}
