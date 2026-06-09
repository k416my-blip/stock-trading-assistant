/**
 * AIコンシェルジュ投資憲章（Investment Charter）
 * 分析結果やモデルが変わっても投資方針がブレないよう固定する正本
 */
export const INVESTMENT_CHARTER_VERSION = '1.0.0';

export const AI_CONCIERGE_ROLE_JA = '投資委員長';

export const AI_CONCIERGE_INVESTMENT_CHAIR_JA = 'AIコンシェルジュ（投資委員長）';

export const INVESTMENT_CHARTER_MISSION_JA =
  'ユーザー資産の長期的成長を目指す。';

export const INVESTMENT_PHILOSOPHY_SUMMARY_JA = '長期資産成長重視';

export const INVESTMENT_CHARTER_PRIORITIES_JA = [
  '第1優先: 大きな損失を避ける',
  '第2優先: 資産を増やす',
  '第3優先: 配当・キャッシュフロー',
  '第4優先: Malaysia v4との整合性',
] as const;

export const INVESTMENT_CHARTER_CORE_RULES_JA = [
  '無理にBUYしない',
  '分からない時は保留',
  '根拠不足は不採用',
] as const;

/** BUY最低条件 — 賛成理由件数 */
export const CHARTER_MIN_APPROVAL_REASONS = 3;

/** BUY最低条件 — 反対理由件数 */
export const CHARTER_MIN_OPPOSITION_REASONS = 1;

/** BUY最低条件 — 信頼度（%） */
export const CHARTER_MIN_BUY_CONFIDENCE_PCT = 60;

/** BUY最低条件 — 総合スコア */
export const CHARTER_MIN_BUY_SCORE = 60;

/** BUY追加条件 — 以下のうち必要件数 */
export const CHARTER_MIN_QUALITY_SIGNALS = 2;

export const CHARTER_QUALITY_SIGNAL_LABELS = {
  earnings_good: '決算良好',
  revenue_growth: '売上成長',
  profit_growth: '利益成長',
  dividend_stable: '配当維持または増配',
  per_cheap: 'PER割安',
  pbr_cheap: 'PBR割安',
  news_good: 'ニュース良好',
  industry_tailwind: '業界追い風',
  volume_good: '出来高良好',
  trend_good: 'トレンド良好',
} as const;

export type CharterQualitySignalId = keyof typeof CHARTER_QUALITY_SIGNAL_LABELS;

export const CHARTER_PER_CHEAP_MAX = 18;
export const CHARTER_PBR_CHEAP_MAX = 2.0;
export const CHARTER_EARNINGS_GOOD_MIN_SCORE = 55;
export const CHARTER_TECHNICAL_GOOD_MIN_SCORE = 55;
export const CHARTER_NEWS_GOOD_MIN_SCORE = 55;
export const CHARTER_VOLUME_SURGE_MIN = 1.2;
export const CHARTER_ABNORMAL_VOLATILITY_PCT = 35;
export const CHARTER_CONTINUOUS_LOSS_GROWTH_PCT = -15;

export const COMMITTEE_DECISION_HIERARCHY_JA =
  '投資憲章 v1 · 投資委員長: AIコンシェルジュ · 参考: Malaysia v4 · 最終承認: ユーザー';

export const USER_FINAL_APPROVAL_NOTE_JA =
  '投資憲章に基づく参考審議です。最終の売買判断・承認はユーザーが行ってください。';

export const OPPOSITION_FALLBACK_JA =
  '現時点で確認できた重大な反対材料は限定的（過度な楽観・見落としリスクに注意）';

export const CHARTER_WHY_BUTTON_LABEL_JA = 'なぜこの銘柄なの？';

/** @deprecated CHARTER_MIN_APPROVAL_REASONS を使用 */
export const MIN_COMMITTEE_REASONS_TOTAL = CHARTER_MIN_APPROVAL_REASONS;

/** @deprecated CHARTER_MIN_BUY_SCORE を使用 */
export const MIN_BUY_RECOMMENDATION_SCORE = CHARTER_MIN_BUY_SCORE;

/** @deprecated CHARTER_MIN_BUY_CONFIDENCE_PCT を使用 */
export const MIN_BUY_CONFIDENCE_PCT = CHARTER_MIN_BUY_CONFIDENCE_PCT;
