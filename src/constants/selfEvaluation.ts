import type { BiasKind, ReputationDomainId, WeaknessKind } from '../types/selfEvaluation';

export const SELF_EVAL_MAX_JOURNAL = 40;
export const SELF_EVAL_MAX_CONTRADICTIONS = 24;
export const SELF_EVAL_HIGH_CONFIDENCE_PCT = 72;
export const SELF_EVAL_OVERCONFIDENT_MISS_STREAK = 2;
export const SELF_EVAL_CONFIDENCE_PENALTY_STEP = 4;
export const SELF_EVAL_MAX_CONFIDENCE_PENALTY = 25;
export const SELF_EVAL_HUMILITY_TRUST_THRESHOLD = 42;
export const SELF_EVAL_HALLUCINATION_THIN_MIN = 3;
export const SELF_EVAL_NOTIFICATION_BUDGET_DAILY = 12;
export const SELF_EVAL_FATIGUE_STRIKE_THRESHOLD = 8;
export const SELF_EVAL_COOLDOWN_TRADES_24H = 6;
export const SELF_EVAL_REVENGE_WINDOW_MS = 4 * 60 * 60 * 1000;

export const SELF_EVAL_REGULATORY_BANNER_JA =
  '参考情報のみ。学習・モデル更新・外部送信は行いません。ルールベースの自己評価です。';

export const SELF_EVAL_AI_PROMPT_JA = `
【Self-Evaluation & Adaptive Intelligence — ルールベース】
- 機械学習・自己改変コード・外部学習は禁止。ローカル評価のみ。
- 不確実性が高いときは断定を避け、「分からない」または watch のみを優先。
- 高confidenceの外れが続く場合は confidence を下げた前提で説明する。
- バイアス（強気・パニック・リベンジ・過剰トレード）を自覚して言及する。
`.trim();

export const BIAS_LABELS_JA: Record<BiasKind, string> = {
  bullish: '強気バイアス',
  panic: 'パニックバイアス',
  revenge: 'リベンジトレード傾向',
  overtrading: '過剰トレード',
};

export const WEAKNESS_LABELS_JA: Record<WeaknessKind, string> = {
  panic: 'パニック相場',
  sideways: 'レンジ相場',
  low_liquidity: '低流動性',
  earnings: '決算前後',
};

export const REPUTATION_DOMAIN_LABELS_JA: Record<ReputationDomainId, string> = {
  macro: 'マクロ',
  sentiment: 'センチメント',
  earnings: '決算',
  technical: 'テクニカル',
};

export const SELF_EVAL_UI_LABELS_JA = {
  panelTitle: 'AI Self Evaluation',
  safety: 'ローカル自己評価（学習なし）',
  accuracy: '精度トラッカー',
  trust: 'AI Trust Score',
  calibration: 'Confidence校正',
  quality: '提案品質',
  biases: 'バイアス検知',
  weaknesses: '苦手パターン',
  regimeFit: 'レジーム適応',
  strategyFit: '戦略フィットネス',
  humility: '謙虚モード',
  heatmap: 'Confidence vs 実績',
  mistakes: '失敗リプレイ',
  journal: '反省ジャーナル',
  explain: 'なぜそう考えたか',
  adaptive: '適応調整',
  hallucination: 'Hallucinationリスク',
} as const;

/** Base alert threshold; multiplied by volatility regime */
export const SELF_EVAL_BASE_ALERT_THRESHOLD_PCT = 55;
