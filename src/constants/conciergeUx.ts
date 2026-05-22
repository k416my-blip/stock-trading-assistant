import type { ConciergeInfoPriority, ConciergeRiskColor, ConciergeUxDisplayMode } from '../types/conciergeUx';

export const CONCIERGE_UX_MODE_LABELS_JA: Record<ConciergeUxDisplayMode, string> = {
  beginner: '初心者モード',
  advanced: '上級者モード',
};

export const CONCIERGE_UX_MODE_HINTS_JA: Record<ConciergeUxDisplayMode, string> = {
  beginner: '結論先出し・用語を簡略化。詳細根拠は折りたたみ。',
  advanced: 'evidence・センチメント生値・コスト推定を表示。',
};

export const CONCIERGE_PRIORITY_LABELS_JA: Record<ConciergeInfoPriority, string> = {
  critical: '最重要',
  high: '重要',
  medium: '参考',
  low: '詳細',
};

export const CONCIERGE_RISK_COLOR_HEX: Record<ConciergeRiskColor, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
};

export const CONCIERGE_RISK_LABELS_JA: Record<ConciergeRiskColor, string> = {
  green: '落ち着き',
  yellow: '注意',
  orange: '警戒',
  red: '危険',
};

export const CONCIERGE_UX_AI_PROMPT_JA = `
【UX — 人間のアナリスト風・ストレス低減】
- 最初に結論1文、その後理由を最大3つ（箇条書き）、最後に推奨行動（断定でなく選択肢）。
- パニックを煽る語（「大変」「絶対」「今すぐ売れ/買え」）は禁止。冷静なアナリスト口調。
- context.conciergeUx.summary があれば冒頭で状況を1文要約。
- 専門用語は短い補足を添える（初心者向け）。
`.trim();

export const PANIC_WORD_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /パニック/g, replacement: '警戒感' },
  { pattern: /大パニック/g, replacement: '急な不安' },
  { pattern: /絶対/g, replacement: '強い' },
  { pattern: /今すぐ売れ/g, replacement: '売却は慎重に' },
  { pattern: /今すぐ買え/g, replacement: '新規買いは慎重に' },
];

export const NOTIFICATION_DIGEST_MIN_COUNT = 2;
export const NOTIFICATION_DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 小変動抑制: 日中変動がこの%未満かつ low 優先度なら通知候補を抑制 */
export const AI_NOISE_FILTER_MAX_CHANGE_PCT = 1.5;
