/**
 * AIコンシェルジュ向け実データ根拠 — 市場・ニュース・X・保有
 */
import type { AppState, Market, PortfolioPosition, StockFundamentals } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import type { ConciergeEvidenceBundle, ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import {
  AI_ANALYSIS_MODE_LABELS_JA,
  type AiAnalysisMode,
} from '../constants/aiDataDriven';
import { X_SYMBOL_CACHE_TTL_MS } from '../constants/xApiConservation';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import { formatSymbolDisplay } from '../utils/formatSymbolDisplay';
import { getActivePortfolio } from './portfolioPriceUpdate';
import {
  normalizeSymbolKey,
  resolveSymbolsForAdvice,
} from './userAnalysisSymbols';
import type { AiAnalysisSymbolScope } from '../constants/aiAnalysisScope';
import { fetchConciergeNewsEvidence } from './conciergeNewsFetchProbe';
import { fetchConciergeXEvidence } from './conciergeXFetchProbe';
import { extractSymbolsForXLookup, userMessageRequestsXInsight } from './xApiIntent';
import { extractEntitiesFromText } from './aiConciergeEntityExtraction';
import { detectUnusualActivityForSymbol } from './conciergeAnomalyDetector';
import { buildConciergeActionGuide } from './conciergeActionGuideBuilder';
import {
  buildAnalysisDiagnostics,
  probeConciergeSymbolQuotes,
} from './conciergeSymbolFetchDiagnostics';
import { buildOverallConfidenceBasisJa } from './conciergeConfidenceBasis';
import { attachRiskControlToEvidence } from './conciergeRiskControlBuilder';
import { buildConciergeNewsQuery } from './conciergeNewsFetchProbe';
import { logConciergeTargetSymbol, logTargetResolve } from './conciergeTargetSymbolLog';

const MAX_SYMBOLS = 3;

function normalizeSym(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK|US)$/i, '');
}

function toBursaKlSymbol(symbol: string, market: Market): string {
  if (market !== 'bursa') return symbol;
  return `${normalizeSym(symbol)}.KL`;
}

function normalizeUserMessageForMatch(userMessage: string): string {
  return userMessage.normalize('NFKC').trim();
}

function dayChangePct(bars: { close: number }[]): { previousClose: number | null; pct: number | null } {
  if (bars.length < 2) return { previousClose: null, pct: null };
  const previousClose = bars[bars.length - 2].close;
  const last = bars[bars.length - 1].close;
  if (previousClose <= 0) return { previousClose, pct: null };
  return { previousClose, pct: ((last - previousClose) / previousClose) * 100 };
}

function volumeFromBars(bars: { volume: number }[]): number | null {
  if (bars.length === 0) return null;
  return bars[bars.length - 1].volume;
}

function volumeSurgeRatio(bars: { volume: number }[]): number | null {
  if (bars.length < 10) return null;
  const volumes = bars.map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return recent / prior;
}

function toStockFundamentals(
  symbol: string,
  market: Market,
  companyName: string,
  price: number,
  volume: number,
): StockFundamentals {
  return {
    symbol,
    name: companyName,
    market,
    currency: market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR',
    price,
    dividendYield: 0,
    per: 0,
    marketCap: 0,
    volume,
    category: 'growth',
    beginnerFriendly: false,
  };
}

const COMPANY_SYMBOL_MAP: Record<string, string> = {
  マレー銀行: '1155',
  Maybank: '1155',
};

/** ユーザーが特定銘柄を指しているときはポートフォリオ全体へ広げない */
export function userNamesExplicitStockTarget(userMessage: string): boolean {
  const msg = normalizeUserMessageForMatch(userMessage);
  if (!msg) return false;
  if (/maybank|マレー銀行|malayan banking/i.test(msg)) return true;
  const entities = extractEntitiesFromText(msg);
  if (entities.companyNames.length > 0 || entities.tickers.length > 0) return true;
  if (/\b\d{4}\b/.test(msg)) return true;
  if (/\b(AAPL|TSLA|NVDA|MSFT|GOOGL|AMZN|META)\b/i.test(msg)) return true;
  return false;
}

function targetFromCore(
  core: string,
  active: PortfolioPosition[],
): { symbol: string; market: Market; position?: PortfolioPosition } {
  const stock = findStock(core);
  const pos = active.find((p) => normalizeSym(p.symbol) === normalizeSym(core));
  return {
    symbol: pos?.symbol ?? stock?.symbol ?? core,
    market: pos?.market ?? stock?.market ?? 'bursa',
    position: pos,
  };
}

/** 分析対象銘柄（ユーザーメッセージ優先 · スコープ内のみ） */
export function resolveConciergeAnalysisTargets(
  userMessage: string,
  holdings: PortfolioPosition[],
  scopeSymbols?: Array<{ symbol: string; market: Market; position?: PortfolioPosition }>,
): Array<{ symbol: string; market: Market; position?: PortfolioPosition }> {
  const msgNorm = normalizeUserMessageForMatch(userMessage);
  const active = holdings.filter((p) => (p.shares ?? 0) > 0);
  const allowedKeys = scopeSymbols
    ? new Set(scopeSymbols.map((s) => normalizeSymbolKey(s.symbol)))
    : null;
  const heldBrief = active.map((p) => ({ symbol: p.symbol, market: p.market }));
  const explicit = userNamesExplicitStockTarget(userMessage);
  const out = new Map<string, { symbol: string; market: Market; position?: PortfolioPosition }>();

  const isAllowed = (sym: string) =>
    !allowedKeys || allowedKeys.has(normalizeSymbolKey(sym));

  const addCore = (core: string) => {
    const t = targetFromCore(core, active);
    if (!isAllowed(t.symbol)) return;
    out.set(normalizeSym(core), {
      ...t,
      symbol: toBursaKlSymbol(t.symbol, t.market),
    });
  };

  if (/maybank|マレー銀行|malayan banking/i.test(msgNorm)) {
    const t = targetFromCore('1155', active);
    const fixed = [{ ...t, symbol: toBursaKlSymbol('1155', t.market) }];
    logTargetResolve({ input: userMessage.trim(), targets: fixed.map((x) => x.symbol) });
    return fixed;
  }

  const entities = extractEntitiesFromText(userMessage);
  for (const companyName of entities.companyNames) {
    const core = COMPANY_SYMBOL_MAP[companyName];
    if (core) addCore(core);
  }

  for (const t of extractSymbolsForXLookup(userMessage, heldBrief, {
    allowSingleHoldingFallback: false,
  })) {
    if (!isAllowed(t.symbol)) continue;
    const pos = active.find((p) => normalizeSym(p.symbol) === normalizeSym(t.symbol));
    out.set(normalizeSym(t.symbol), {
      symbol: pos?.symbol ?? t.symbol,
      market: pos?.market ?? t.market,
      position: pos,
    });
  }

  if (out.size === 0 && !explicit && scopeSymbols?.length) {
    for (const s of scopeSymbols.slice(0, MAX_SYMBOLS)) {
      out.set(normalizeSym(s.symbol), s);
    }
  } else if (out.size === 0 && !explicit) {
    for (const p of active.slice(0, MAX_SYMBOLS)) {
      if (!isAllowed(p.symbol)) continue;
      out.set(normalizeSym(p.symbol), { symbol: p.symbol, market: p.market, position: p });
    }
  }

  if (explicit) {
    const picked = [...out.values()].slice(0, 1).map((t) => ({
      ...t,
      symbol: toBursaKlSymbol(t.symbol, t.market),
    }));
    logTargetResolve({ input: userMessage.trim(), targets: picked.map((t) => t.symbol) });
    return picked;
  }

  const portfolioTargets = [...out.values()].slice(0, MAX_SYMBOLS).map((t) => ({
    ...t,
    symbol: toBursaKlSymbol(t.symbol, t.market),
  }));
  logTargetResolve({ input: userMessage.trim(), targets: portfolioTargets.map((t) => t.symbol) });
  return portfolioTargets;
}

async function buildSymbolEvidence(
  target: { symbol: string; market: Market; position?: PortfolioPosition },
  userMessage: string,
  apiKeys: AnalysisApiKeys,
  fetchXLive: boolean,
  options?: { skipLiveNews?: boolean; newsSource?: 'chat' | 'proactive' | 'allocation' },
): Promise<{ evidence: ConciergeSymbolEvidence; fetchRows: import('../types/conciergeEvidence').ConciergeFetchResultRow[] }> {
  const sample = findStock(normalizeSym(target.symbol));
  const companyName = sample?.name ?? target.position?.companyName ?? target.symbol;
  const bars = getSamplePriceHistory(normalizeSym(target.symbol));
  const { previousClose, pct: barPct } = dayChangePct(bars);
  const pos = target.position;

  const stock = toStockFundamentals(
    target.symbol,
    target.market,
    companyName,
    sample?.price ?? bars.at(-1)?.close ?? 0,
    sample?.volume ?? 0,
  );

  const newsPack = options?.skipLiveNews
    ? {
        headlines: [] as ConciergeSymbolEvidence['latestFinancialNews'],
        newsSummaryJa: '自発スキャン: ニュースライブ取得スキップ',
        newsSource: '—',
        fromCache: false,
        row: {
          source: 'newsapi' as const,
          ok: false,
          detailJa: 'proactive skip',
          headlineCount: 0,
        },
      }
    : await fetchConciergeNewsEvidence(stock, apiKeys, userMessage, {
        source: options?.newsSource ?? 'chat',
      });

  const [xPack, quoteProbe] = await Promise.all([
    fetchConciergeXEvidence(stock, apiKeys, fetchXLive),
    probeConciergeSymbolQuotes(target.symbol, target.market),
  ]);
  const news = {
    headlines: newsPack.headlines,
    newsSummaryJa: newsPack.newsSummaryJa,
    newsSource: newsPack.newsSource,
    fromCache: newsPack.fromCache,
  };
  const xSentiment = xPack.xSentiment;

  const livePrice =
    (quoteProbe.twelve.ok && quoteProbe.twelve.price != null
      ? quoteProbe.twelve.price
      : null) ??
    (quoteProbe.yahoo.ok && quoteProbe.yahoo.price != null ? quoteProbe.yahoo.price : null);

  const currentPrice = pos?.currentPrice ?? livePrice ?? sample?.price ?? bars.at(-1)?.close ?? null;
  const volRatio = volumeSurgeRatio(bars);
  const volume = volumeFromBars(bars) ?? sample?.volume ?? null;

  let unrealizedPnlPct: number | null = null;
  if (pos && pos.averageBuyPrice > 0 && currentPrice != null) {
    unrealizedPnlPct = ((currentPrice - pos.averageBuyPrice) / pos.averageBuyPrice) * 100;
  }

  const fetchRows = [quoteProbe.twelve, quoteProbe.yahoo, newsPack.row, xPack.row];
  const trendingKeywords = [
    ...news.headlines.slice(0, 2).map((h) => h.title.split(/\s+/).slice(0, 4).join(' ')),
    ...(xSentiment?.trendWords ?? []),
  ].filter(Boolean);

  const dataGapsJa: string[] = [];
  if (news.headlines.length === 0) dataGapsJa.push('ニュース見出し未取得');
  if (!xSentiment) dataGapsJa.push('Xセンチメント未取得（キャッシュなし・今回未取得）');
  if (currentPrice == null) dataGapsJa.push('現在株価不明');
  if (previousClose == null) dataGapsJa.push('前日終値不明');

  const intradayChangePct =
    barPct ??
    (previousClose != null && currentPrice != null && previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : null);

  const unusualActivityFlags = detectUnusualActivityForSymbol({
    intradayChangePct,
    volumeSurgeRatio: volRatio,
    xSentiment,
  });

  return {
    evidence: {
    symbol: target.symbol,
    companyName,
    market: target.market,
    displayLabelJa: formatSymbolDisplay({
      symbol: target.symbol,
      market: target.market,
      companyName,
    }),
    currentPrice,
    previousClose,
    intradayChangePct,
    volume,
    volumeSurgeRatio: volRatio,
    quoteAgeSeconds: pos?.quoteAgeSeconds ?? null,
    quoteIsStale: pos?.isStale ?? false,
    portfolioHolding: pos
      ? {
          shares: pos.shares,
          averageBuyPrice: pos.averageBuyPrice,
          unrealizedPnlPct,
        }
      : null,
    latestFinancialNews: news.headlines,
    newsSummaryJa: news.newsSummaryJa,
    newsSource: news.newsSource,
    xSentiment,
    trendingKeywords: [...new Set(trendingKeywords)].slice(0, 8),
    unusualActivityFlags,
    dataGapsJa,
    },
    fetchRows,
  };
}

export type BuildConciergeEvidenceInput = {
  state: AppState;
  userMessage: string;
  apiKeys: AnalysisApiKeys;
  analysisMode: AiAnalysisMode;
  symbolScope?: AiAnalysisSymbolScope;
  isPractice?: boolean;
};

export async function buildConciergeEvidenceBundle(
  input: BuildConciergeEvidenceInput,
): Promise<ConciergeEvidenceBundle> {
  const holdings = getActivePortfolio(input.state);
  const isPractice = input.isPractice ?? input.state.appMode === 'practice';
  const scope = input.symbolScope ?? 'holdings_watchlist';
  const scopeRefs = resolveSymbolsForAdvice(input.state, isPractice, scope);
  const scopeTargets = scopeRefs.map((ref) => {
    const pos = holdings.find(
      (p) => normalizeSymbolKey(p.symbol) === normalizeSymbolKey(ref.symbol),
    );
    return {
      symbol: pos?.symbol ?? ref.symbol,
      market: pos?.market ?? ref.market,
      position: pos,
    };
  });
  const targets = resolveConciergeAnalysisTargets(
    input.userMessage,
    holdings,
    scopeTargets,
  );
  const explicitTarget = userNamesExplicitStockTarget(input.userMessage);
  const fetchXLive = userMessageRequestsXInsight(input.userMessage);

  const primaryTarget = targets[0];
  if (primaryTarget) {
    const sample = findStock(normalizeSym(primaryTarget.symbol));
    const resolvedName = sample?.name ?? primaryTarget.symbol;
    const newsQuery = buildConciergeNewsQuery(
      toStockFundamentals(
        primaryTarget.symbol,
        primaryTarget.market,
        resolvedName,
        sample?.price ?? 0,
        sample?.volume ?? 0,
      ),
      input.userMessage,
    );
    logConciergeTargetSymbol({
      input: input.userMessage.trim(),
      resolvedSymbol: primaryTarget.symbol,
      resolvedName,
      newsQueries: [newsQuery],
      usedNewsTitles: [],
      separatePortfolioNews: explicitTarget ? false : targets.length > 1,
    });
  }
  const cacheNotesJa = [
    `X: キャッシュ${Math.round(X_SYMBOL_CACHE_TTL_MS / 60000)}分${fetchXLive ? '・質問時に未取得分を取得' : '・キャッシュのみ'}`,
    'ニュース: キャッシュ30分',
    '株価: 保有のライブ更新（1〜5分間隔）',
  ];

  const built = await Promise.all(
    targets.map((target, i) =>
      buildSymbolEvidence(target, input.userMessage, input.apiKeys, fetchXLive && i === 0),
    ),
  );
  const symbols = built.map((b) => b.evidence);
  const primaryFetchRows = built[0]?.fetchRows ?? [];
  const primary = symbols[0];
  if (primary) {
    const stock = toStockFundamentals(
      primary.symbol,
      primary.market,
      primary.companyName,
      primary.currentPrice ?? 0,
      primary.volume ?? 0,
    );
    logConciergeTargetSymbol({
      input: input.userMessage.trim(),
      resolvedSymbol: primary.symbol,
      resolvedName: primary.companyName,
      newsQueries: [buildConciergeNewsQuery(stock, input.userMessage)],
      usedNewsTitles: primary.latestFinancialNews.map((h) => h.title).slice(0, 8),
      separatePortfolioNews: explicitTarget ? false : targets.length > 1,
    });
  }

  const flagCount = symbols.reduce((n, s) => n + s.unusualActivityFlags.length, 0);
  const globalSummaryJa =
    symbols.length === 0
      ? '対象銘柄を特定できませんでした。銘柄コードを含めて質問してください。'
      : `${symbols.length}銘柄の実データを添付（分析モード: ${AI_ANALYSIS_MODE_LABELS_JA[input.analysisMode]}）` +
        (flagCount > 0 ? ` · 異常フラグ ${flagCount}件` : '');

  const partial = {
    generatedAt: new Date().toISOString(),
    analysisMode: input.analysisMode,
    symbols,
    globalSummaryJa,
    cacheNotesJa,
  };
  const withGuide = {
    ...partial,
    actionGuide: buildConciergeActionGuide(partial),
  };
  const bundled = attachRiskControlToEvidence(withGuide);
  const primarySym = symbols[0];
  const primaryGuide = bundled.actionGuide.symbols[0];
  const diagnostics =
    primarySym != null && primaryGuide != null
      ? buildAnalysisDiagnostics({
          userMessage: input.userMessage,
          symbol: primarySym.symbol,
          market: primarySym.market,
          fetchRows: primaryFetchRows,
          sym: primarySym,
          guide: primaryGuide,
          confidenceBasisJa: buildOverallConfidenceBasisJa(
            symbols,
            bundled.actionGuide.symbols,
            bundled.actionGuide.overallConfidencePct,
          ),
        })
      : undefined;
  return diagnostics ? { ...bundled, analysisDiagnostics: diagnostics } : bundled;
}

/** おすすめ配分 — ユーザー銘柄ユニバース向けコンシェルジュ根拠（最上位意思決定） */
export async function buildConciergeEvidenceForAllocationUniverse(input: {
  state: AppState;
  universe: StockFundamentals[];
  apiKeys: AnalysisApiKeys;
  analysisMode: AiAnalysisMode;
}): Promise<ConciergeEvidenceBundle> {
  const holdings = getActivePortfolio(input.state);
  const targets = input.universe.slice(0, 12).map((stock) => {
    const pos = holdings.find(
      (p) => normalizeSymbolKey(p.symbol) === normalizeSymbolKey(stock.symbol),
    );
    return {
      symbol: stock.symbol,
      market: stock.market,
      position: pos,
    };
  });
  const built = await Promise.all(
    targets.map((target) =>
      buildSymbolEvidence(target, '', input.apiKeys, false, {
        skipLiveNews: true,
        newsSource: 'allocation',
      }),
    ),
  );
  const symbols = built.map((b) => b.evidence);
  const partial = {
    generatedAt: new Date().toISOString(),
    analysisMode: input.analysisMode,
    symbols,
    globalSummaryJa: `配分候補${symbols.length}銘柄 — AIコンシェルジュ根拠`,
    cacheNotesJa: ['配分プラン: ニュース/Xはキャッシュ優先'],
  };
  return attachRiskControlToEvidence({
    ...partial,
    actionGuide: buildConciergeActionGuide(partial),
  });
}

/** 自発通知用 — スコープ内銘柄をキャッシュのみでスキャン */
export async function buildConciergeEvidenceForProactive(
  state: AppState,
  apiKeys: AnalysisApiKeys,
  analysisMode: AiAnalysisMode,
  options?: {
    isPractice?: boolean;
    symbolScope?: AiAnalysisSymbolScope;
  },
): Promise<ConciergeEvidenceBundle> {
  const isPractice = options?.isPractice ?? state.appMode === 'practice';
  const scope = options?.symbolScope ?? 'holdings_watchlist';
  const refs = resolveSymbolsForAdvice(state, isPractice, scope);
  const holdings = getActivePortfolio(state).filter((p) => (p.shares ?? 0) > 0);
  const scopeTargets = refs.map((ref) => {
    const pos = holdings.find((p) => normalizeSymbolKey(p.symbol) === normalizeSymbolKey(ref.symbol));
    return {
      symbol: pos?.symbol ?? ref.symbol,
      market: pos?.market ?? ref.market,
      position: pos,
    };
  });
  const targets = scopeTargets.length > 0 ? scopeTargets : holdings.map((p) => ({
    symbol: p.symbol,
    market: p.market,
    position: p,
  }));
  const symbols: ConciergeSymbolEvidence[] = [];
  for (const t of targets) {
    const built = await buildSymbolEvidence(t, '', apiKeys, false, {
      skipLiveNews: true,
      newsSource: 'proactive',
    });
    symbols.push(built.evidence);
  }
  const flagCount = symbols.reduce((n, s) => n + s.unusualActivityFlags.length, 0);
  const partial = {
    generatedAt: new Date().toISOString(),
    analysisMode,
    symbols,
    globalSummaryJa:
      flagCount > 0
        ? `保有${symbols.length}銘柄で異常フラグ ${flagCount}件`
        : `保有${symbols.length}銘柄 — 大きな異常なし`,
    cacheNotesJa: ['自発スキャン: Xライブ取得なし・ニュース/Xはキャッシュのみ'],
  };
  return attachRiskControlToEvidence({
    ...partial,
    actionGuide: buildConciergeActionGuide(partial),
  });
}
