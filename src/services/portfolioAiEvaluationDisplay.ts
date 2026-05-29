import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type {
  PortfolioAiDataSources,
  PortfolioAiDisplayTone,
} from '../types/portfolioAiEvaluation';
import type { AiSecondEvaluatorSymbolInput } from '../types/aiSecondEvaluator';

export function actionToDisplayTone(action: AiSecondEvaluatorAction): PortfolioAiDisplayTone {
  if (action === 'buy') return 'buy';
  if (action === 'reduce') return 'sell';
  return 'hold';
}

export function displayToneLabelJa(tone: PortfolioAiDisplayTone): string {
  switch (tone) {
    case 'buy':
      return '買い';
    case 'sell':
      return '売り';
    default:
      return '保有';
  }
}

function formatQuoteSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes('yahoo')) return 'Yahoo';
  if (v.includes('twelve')) return 'TwelveData';
  if (v.includes('bursa')) return 'Bursa';
  return raw;
}

function formatRsiSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes('yahoo')) return 'Yahoo';
  if (v.includes('bursa')) return 'Bursa';
  if (v.includes('local') || v.includes('sample')) return 'Local';
  return raw;
}

function formatNewsSource(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  if (/rss|yahoo|google|news/i.test(raw)) return 'News';
  return 'News';
}

function formatXSource(raw: string | null | undefined): string | null {
  if (!raw?.trim() || raw === 'skipped') return null;
  if (/x_|twitter|live|cache/i.test(raw)) return 'X';
  return 'X';
}

export function buildDataSourcesFromInput(inp: AiSecondEvaluatorSymbolInput): PortfolioAiDataSources {
  return {
    quote: formatQuoteSource(inp.quoteSource),
    rsi: formatRsiSource(inp.rsiSource),
    news: formatNewsSource(inp.newsSource),
    x: formatXSource(inp.xFetchSource),
  };
}

export function formatDataSourcesLine(sources: PortfolioAiDataSources): string {
  const parts = [sources.quote, sources.rsi, sources.news, sources.x].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function formatEvaluatedAtJa(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
