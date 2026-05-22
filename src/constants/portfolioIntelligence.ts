import type { UserTradingStyleId } from '../types/portfolioIntelligence';

export const PORTFOLIO_INTEL_STORAGE_KEY = '@sta/portfolio_intelligence_v1';

export const MAX_JOURNAL_ENTRIES = 120;
export const MAX_PREDICTIONS = 100;
export const JOURNAL_ARCHIVE_AFTER_DAYS = 90;
export const PREDICTION_SHORT_HORIZON_DAYS = 5;
export const PREDICTION_MEDIUM_HORIZON_DAYS = 14;
export const NOTIFICATION_REPEAT_SUPPRESS_COUNT = 4;
export const NOTIFICATION_INTEL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const USER_STYLE_LABELS_JA: Record<UserTradingStyleId, string> = {
  averaging_down: 'ナンピン型',
  short_term: '短期型',
  long_term: '長期型',
  panic_seller: 'panic売り傾向',
  balanced_trader: 'バランス型',
};

export const PORTFOLIO_INTEL_PURPOSE_JA =
  '本AIは売買断定ではなく、意思決定補助に限定されます。最終判断はユーザー自身が行ってください。';

export const PORTFOLIO_INTEL_PRIVACY_JA =
  'ポートフォリオ記憶・ジャーナル・予測追跡は端末ローカルに保存。OpenAIには集約サマリーのみ送信し、生の取引ログ全文は送りません。';

export const PORTFOLIO_INTEL_AI_PROMPT_JA = `
【Portfolio Intelligence — 意思決定補助のみ】
context.portfolioIntelligence に過去取引・行動傾向・予測精度・週次レビューがあります。

必須:
- 売買断定（「今すぐ買え/売れ」）は禁止。選択肢とリスクの整理に留める。
- portfolioIntelligence.similarCasesJa があれば「過去類似ケース」として引用する。
- suggestedAnalysisMode は端末側の傾向推定であり、ユーザーの人格変更ではない。

禁止:
- 学習データでユーザーの思想・価値観を推測すること
`.trim();
