/**
 * Malaysia v4 — 参考モデル（固定推奨ではない）
 * 監査確定値: forwardValidationMalaysiaV4OpsMonitorAudit と同期
 */
export const MALAYSIA_V4_REFERENCE_SYMBOLS = ['5347', '1023', '5398', '6742', '3336'] as const;

export type MalaysiaV4ReferenceSymbol = (typeof MALAYSIA_V4_REFERENCE_SYMBOLS)[number];

/** 参考ウェイト（%）— 推奨配分の一致率計算に使用 */
export const MALAYSIA_V4_REFERENCE_WEIGHTS: Record<MalaysiaV4ReferenceSymbol, number> = {
  '5347': 23.3,
  '1023': 23.3,
  '5398': 15.0,
  '6742': 15.0,
  '3336': 23.3,
};

export const MALAYSIA_V4_REFERENCE_LABELS: Record<MalaysiaV4ReferenceSymbol, string> = {
  '5347': 'TENAGA',
  '1023': 'CIMB',
  '5398': 'GAMUDA',
  '6742': 'YTL',
  '3336': 'IJM',
};

export const RECOMMENDATION_DECISION_HIERARCHY_JA =
  '1. AIコンシェルジュ → 2. Malaysia v4（参考） → 3. 固定ロジック · 最終承認はユーザー';

export const USER_FINAL_APPROVAL_NOTE_JA =
  '参考情報です。最終の売買判断・承認はユーザーが行ってください。';
