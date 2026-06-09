/** AI分析・提案の銘柄スコープ（設定画面） */
export type AiAnalysisSymbolScope =
  | 'holdings_only'
  | 'holdings_watchlist'
  | 'holdings_watchlist_orders';

export const AI_ANALYSIS_SYMBOL_SCOPE_ORDER: AiAnalysisSymbolScope[] = [
  'holdings_only',
  'holdings_watchlist',
  'holdings_watchlist_orders',
];

export const AI_ANALYSIS_SYMBOL_SCOPE_LABELS_JA: Record<AiAnalysisSymbolScope, string> = {
  holdings_only: '保有銘柄のみ',
  holdings_watchlist: '保有＋ウォッチリスト',
  holdings_watchlist_orders: '保有＋ウォッチリスト＋注文候補',
};

export const AI_ANALYSIS_SYMBOL_SCOPE_HINTS_JA: Record<AiAnalysisSymbolScope, string> = {
  holdings_only: 'ポートフォリオに保有している銘柄だけをAIが分析します。',
  holdings_watchlist:
    '保有銘柄と、手動注文リストの未約定銘柄（ウォッチ対象）を分析します。デフォルト推奨。',
  holdings_watchlist_orders:
    '上記に加え、手動注文リストの約定済み銘柄も分析対象に含めます。',
};

export const DEFAULT_AI_ANALYSIS_SYMBOL_SCOPE: AiAnalysisSymbolScope = 'holdings_watchlist';

export const EMPTY_USER_SYMBOLS_ALLOCATION_JA =
  'まずウォッチリストまたは保有銘柄を登録してください';

export function normalizeAiAnalysisSymbolScope(
  raw: unknown,
): AiAnalysisSymbolScope {
  if (
    raw === 'holdings_only' ||
    raw === 'holdings_watchlist' ||
    raw === 'holdings_watchlist_orders'
  ) {
    return raw;
  }
  return DEFAULT_AI_ANALYSIS_SYMBOL_SCOPE;
}
