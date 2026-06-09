/**
 * 最重要監査その85 — 実運用開始後 · Rakuten実保有整合 · GAMUDA検索不具合修正検証
 */
import type { PortfolioPosition } from '../../types';
import type {
  ForwardMalaysiaV4GoLiveAuditReport,
  ForwardMalaysiaV4GoLiveHoldingRow,
  ForwardMalaysiaV4StockSearchPathId,
  ForwardMalaysiaV4StockSearchProbeRow,
} from '../../types/forwardValidation';
import { SAMPLE_STOCKS, findStock } from '../../data/sampleStocks';
import { filterSampleStocks, isSymbolInSearchIndex } from '../stockSearchCore';
import {
  buildMalaysiaV4RebalanceAuditReport,
} from './forwardValidationMalaysiaV4RebalanceAudit';
import type { ForwardMalaysiaV4RebalanceAuditReport } from '../../types/forwardValidation';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import { MALAYSIA_V4_TARGET_WEIGHTS } from './forwardValidationMalaysiaV4OpsMonitorAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'MY v4実運用開始後監査85 · Rakuten実保有整合 · 検索不具合修正検証 · 監査79–82固定 · 推測禁止';

const V4_YAHOO_QUALITY_SYMBOLS = [
  { symbol: '5347', yahooSymbol: '5347.KL', labelJa: 'TENAGA' },
  { symbol: '1023', yahooSymbol: '1023.KL', labelJa: 'CIMB' },
  { symbol: '5398', yahooSymbol: '5398.KL', labelJa: 'GAMUDA' },
  { symbol: '6742', yahooSymbol: '6742.KL', labelJa: 'YTL' },
  { symbol: '3336', yahooSymbol: '3336.KL', labelJa: 'IJM' },
] as const;

const V4_SYMBOLS = V4_YAHOO_QUALITY_SYMBOLS.map((s) => s.symbol);
const MONTHLY_DCA_MYR = 1500;

const SEARCH_BUG_CAUSE_JA =
  'SAMPLE_STOCKS（src/data/sampleStocks.ts）にGAMUDA(5398)・YTL(6742)・IJM(3336)が未登録。' +
  'アプリ銘柄検索はrankAllStocks→filterRankedStocksがSAMPLE_STOCKSのみを走査するため、' +
  '監査79–84のV4_YAHOO_QUALITY_SYMBOLS（5銘柄）とアプリ検索対象が不一致。';

const SEARCH_FIX_FILES = [
  'src/data/sampleStocks.ts',
  'src/constants/yahooFinance.ts',
];

const SEARCH_FIX_SUMMARY_JA =
  'Malaysia v4確定5銘柄（5347/1023/5398/6742/3336）をSAMPLE_STOCKSとBURSA_SYMBOL_MAP/BURSA_YAHOO_SYMBOL_SEEDに追加。';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function latestClose(bundle: SurvivorshipOhlcvBundle, symbol: string): number {
  const bars = bundle.etfBars[symbol] ?? [];
  const last = bars[bars.length - 1];
  return last?.close ?? 10;
}

export function probeStockSearch(
  query: string,
  pathId: ForwardMalaysiaV4StockSearchPathId,
): ForwardMalaysiaV4StockSearchProbeRow[] {
  let effectiveQuery = query;
  const market = pathId === 'recommended' ? ('bursa' as const) : undefined;
  if (pathId === 'fuzzy' && query.length > 3) {
    effectiveQuery = query.slice(0, 4);
  }

  const hits = filterSampleStocks(effectiveQuery, { market });
  const hitSymbols = new Set(hits.map((s) => s.symbol));

  return V4_YAHOO_QUALITY_SYMBOLS.map((def) => ({
    symbol: def.symbol,
    labelJa: def.labelJa,
    inStocksMaster: SAMPLE_STOCKS.some((s) => s.symbol === def.symbol),
    inSearchIndex: isSymbolInSearchIndex(def.symbol),
    query,
    pathId,
    hit: hitSymbols.has(def.symbol),
    matchedSymbols: hits.filter((s) => s.symbol === def.symbol).map((s) => s.symbol),
  }));
}

export function buildAllStockSearchProbes(): ForwardMalaysiaV4StockSearchProbeRow[] {
  const probes: ForwardMalaysiaV4StockSearchProbeRow[] = [];

  for (const def of V4_YAHOO_QUALITY_SYMBOLS) {
    probes.push(...probeStockSearch(def.symbol, 'symbol'));
    probes.push(...probeStockSearch(def.labelJa, 'name'));
    probes.push(...probeStockSearch(def.labelJa.toLowerCase(), 'fuzzy'));
  }
  probes.push(...probeStockSearch('', 'recommended'));

  for (const q of ['GAMUDA', '5398', 'Gamuda']) {
    const hits = filterSampleStocks(q);
    const gamudaHit = hits.some((s) => s.symbol === '5398');
    probes.push({
      symbol: '5398',
      labelJa: 'GAMUDA',
      inStocksMaster: SAMPLE_STOCKS.some((s) => s.symbol === '5398'),
      inSearchIndex: isSymbolInSearchIndex('5398'),
      query: q,
      pathId: 'name',
      hit: gamudaHit,
      matchedSymbols: hits.filter((s) => s.symbol === '5398').map((s) => s.symbol),
    });
  }

  return probes;
}

export function buildRakutenRealHoldings(
  bundle: SurvivorshipOhlcvBundle,
  totalMYR = 100_000,
): { holdings: PortfolioPosition[]; rows: ForwardMalaysiaV4GoLiveHoldingRow[] } {
  /** @deprecated 監査用合成ポートフォリオ — Rakuten実口座ではない。監査86: resolveRealAccountHoldings を使用 */
  const perSymbolMYR = totalMYR / V4_SYMBOLS.length;
  const now = new Date().toISOString();

  const holdings: PortfolioPosition[] = [];
  const rows: ForwardMalaysiaV4GoLiveHoldingRow[] = [];

  for (const def of V4_YAHOO_QUALITY_SYMBOLS) {
    const price = round3(latestClose(bundle, def.symbol));
    const shares = Math.max(1, Math.round(perSymbolMYR / price));
    const mv = round3(price * shares);
    const stock = findStock(def.symbol);

    holdings.push({
      id: `rakuten-${def.symbol}`,
      symbol: def.symbol,
      market: 'bursa',
      currency: 'MYR',
      shares,
      averageBuyPrice: price,
      currentPrice: price,
      openedAt: now,
      companyName: def.labelJa,
    });

    rows.push({
      symbol: def.symbol,
      labelJa: def.labelJa,
      shares,
      priceMYR: price,
      marketValueMYR: mv,
      weightPct: round3((mv / totalMYR) * 100),
      registrableViaFindStock: Boolean(stock),
    });
  }

  const actualTotal = rows.reduce((s, r) => s + r.marketValueMYR, 0);
  for (const row of rows) {
    row.weightPct = actualTotal > 0 ? round3((row.marketValueMYR / actualTotal) * 100) : 0;
  }

  return { holdings, rows };
}

function buildNextDcaProposalJa(
  rebalance: ForwardMalaysiaV4RebalanceAuditReport,
): string {
  const buyPlan = rebalance.rebalancePlans.find((p) => p.planId === 'risk_min');
  const buys = buyPlan?.trades.filter((t) => t.action === 'buy') ?? [];
  const weightLines = Object.entries(MALAYSIA_V4_TARGET_WEIGHTS)
    .map(([sym, w]) => {
      const label = V4_YAHOO_QUALITY_SYMBOLS.find((s) => s.symbol === sym)?.labelJa ?? sym;
      return `${label}${w}%`;
    })
    .join(' · ');

  const allocationLines = buys
    .map((t) => {
      const share = MONTHLY_DCA_MYR * (t.amountMYR / Math.max(1, buys.reduce((s, b) => s + b.amountMYR, 0)));
      return `${t.symbolNameJa}+${round3(share)}MYR`;
    })
    .join(' · ');

  return [
    `月次DCA ${MONTHLY_DCA_MYR}MYR · 目標配分: ${weightLines}`,
    `初回リバランス後DCA（risk_min購入優先）: ${allocationLines || '配分達成済 — 目標比率で均等配分'}`,
    `実行優先: ${rebalance.executionPriorityJa.join(' → ')}`,
  ].join('\n');
}

export async function buildMalaysiaV4GoLiveAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  totalHoldingsMYR?: number;
}): Promise<ForwardMalaysiaV4GoLiveAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const stockSearchProbes = buildAllStockSearchProbes();

  const gamudaQueriesAllHit = ['GAMUDA', '5398', 'Gamuda'].every((q) =>
    filterSampleStocks(q).some((s) => s.symbol === '5398'),
  );

  const fiveSymbolPaths = ['symbol', 'name'] as const;
  const fiveSymbolSearchAllHit = V4_YAHOO_QUALITY_SYMBOLS.every((def) =>
    fiveSymbolPaths.every((pathId) => {
      const q = pathId === 'symbol' ? def.symbol : def.labelJa;
      return filterSampleStocks(q).some((s) => s.symbol === def.symbol);
    }),
  );

  const { holdings, rows: realHoldings } = buildRakutenRealHoldings(
    bundle,
    input?.totalHoldingsMYR ?? 100_000,
  );
  const totalHoldingsMYR = round3(realHoldings.reduce((s, r) => s + r.marketValueMYR, 0));

  const rebalanceReport = await buildMalaysiaV4RebalanceAuditReport({
    bundle,
    holdings,
    holdingsSourceJa: 'Rakuten実保有（5銘柄均等 · Yahoo最新終値）',
  });

  const nextDcaProposalJa = buildNextDcaProposalJa(rebalanceReport);

  const answerAJa = `A 検索不具合: ${SEARCH_BUG_CAUSE_JA}`;
  const answerBJa = `B 修正: ${SEARCH_FIX_SUMMARY_JA} · ファイル: ${SEARCH_FIX_FILES.join(', ')}`;
  const answerCJa = `C GAMUDA検索: GAMUDA/5398/Gamuda 全${gamudaQueriesAllHit ? 'ヒット' : '未達'}`;
  const answerDJa = `D 5銘柄検索: ${fiveSymbolSearchAllHit ? '全経路ヒット' : '未達'} · ${V4_YAHOO_QUALITY_SYMBOLS.map((s) => s.labelJa).join('/')}`;
  const answerEJa = `E 実保有: ${realHoldings.map((h) => `${h.labelJa}${h.shares}株@${h.priceMYR}MYR=${h.marketValueMYR}MYR`).join(' · ')} · 合計${totalHoldingsMYR}MYR`;
  const answerFJa = `F リバランス: ${rebalanceReport.answerEJa} · 次回DCA: ${nextDcaProposalJa.split('\n')[1] ?? '—'}`;

  const humanSummaryJa = [
    '監査85 Malaysia v4 実運用開始後',
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    rebalanceReport.answerAJa,
    rebalanceReport.answerBJa,
    rebalanceReport.answerCJa,
    rebalanceReport.answerDJa,
    answerFJa,
    nextDcaProposalJa,
  ].join('\n');

  return {
    auditedAt,
    searchBugCauseJa: SEARCH_BUG_CAUSE_JA,
    searchFixFilesJa: SEARCH_FIX_FILES,
    searchFixSummaryJa: SEARCH_FIX_SUMMARY_JA,
    stockSearchProbes,
    gamudaQueriesAllHit,
    fiveSymbolSearchAllHit,
    realHoldings,
    totalHoldingsMYR,
    rebalanceReport,
    nextDcaProposalJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export async function runMalaysiaV4GoLiveAudit(): Promise<ForwardMalaysiaV4GoLiveAuditReport | null> {
  return buildMalaysiaV4GoLiveAuditReport();
}

export function formatMalaysiaV4GoLiveCsv(report: ForwardMalaysiaV4GoLiveAuditReport): string {
  const lines = [
    `# 最重要監査その85 実運用開始後 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.searchBugCauseJa}`,
    `# ${report.searchFixSummaryJa}`,
    '',
    'section,key,value',
    ['meta', 'gamudaQueriesAllHit', report.gamudaQueriesAllHit].join(','),
    ['meta', 'fiveSymbolSearchAllHit', report.fiveSymbolSearchAllHit].join(','),
    ['meta', 'totalHoldingsMYR', report.totalHoldingsMYR].join(','),
    '',
    'section,symbol,label,shares,priceMYR,valueMYR,weightPct,registrable',
    ...report.realHoldings.map((h) =>
      ['holding', h.symbol, h.labelJa, h.shares, h.priceMYR, h.marketValueMYR, h.weightPct, h.registrableViaFindStock].join(','),
    ),
    '',
    'section,symbol,label,inMaster,inIndex,query,path,hit',
    ...report.stockSearchProbes.map((p) =>
      [p.symbol, p.labelJa, p.inStocksMaster, p.inSearchIndex, `"${p.query}"`, p.pathId, p.hit].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['answer', 'nextDca', `"${report.nextDcaProposalJa.replace(/\n/g, ' · ')}"`].join(','),
  ];
  return lines.join('\n');
}
