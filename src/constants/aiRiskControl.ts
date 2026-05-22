import type { SourceReliabilityTier } from '../types/conciergeRiskControl';

/** この確信度未満は推測回答・行動提案を禁止 */
export const CONFIDENCE_GATE_MIN_PCT = 45;

/** 強い警告に必要な独立ソース種別の最低数 */
export const CROSS_VALIDATION_MIN_FAMILIES = 2;

/** ニュース鮮度 — これ以上古いと低評価 */
export const NEWS_STALE_AGE_MS = 30 * 60 * 1000;

/** Xキャッシュ鮮度 */
export const X_STALE_AGE_MS = 15 * 60 * 1000;

/** 株価鮮度 */
export const QUOTE_STALE_AGE_MS = 5 * 60 * 1000;

/** 短時間連続通知の全体抑制窓 */
export const NOTIFICATION_BURST_WINDOW_MS = 8 * 60 * 1000;

export const NOTIFICATION_BURST_MAX_PER_WINDOW = 3;

export const RUMOR_LABEL_PREFIX = '[RUMOR]';

export const ANALYSIS_BLOCKED_LABEL_JA = '分析不能';

export const AI_RISK_CONTROL_PROMPT_JA = `
【Risk Control & Anti-Hallucination — 必須】
context.evidenceData.riskControl を最優先で遵守すること。

1. riskControl.allowSpeculativeAi が false のとき: 推測・因果の断定を禁止。「${ANALYSIS_BLOCKED_LABEL_JA}」または判断材料不足のみ述べる。
2. riskControl.allowActionRecommendations が false のとき: 買い/売り/ナンピン等の行動提案を禁止。
3. 未確認情報には必ず ${RUMOR_LABEL_PREFIX} を付ける（ニュース/Xの噂・投稿のみの材料）。
4. context.evidenceData に無い数値・銘柄を事実として述べない。
5. X/SNS単独では panic・crash・買いシグナルを断定しない。
6. API障害（apiIsolation）があるソースの欠落を他ソースの分析に混ぜない。

回答構成: 「個別要因」と「市場全体要因」を分離。数値は evidenceData のみ引用。
`.trim();

export const SOURCE_RELIABILITY_META: Record<
  SourceReliabilityTier,
  { labelJa: string; weight: number }
> = {
  official_filing: { labelJa: '公式開示', weight: 100 },
  exchange_data: { labelJa: '取引所・株価', weight: 90 },
  major_news: { labelJa: '主要ニュース', weight: 75 },
  social_media: { labelJa: 'SNS/X', weight: 40 },
  anonymous_rumor: { labelJa: '匿名・噂', weight: 20 },
};

export const AI_TEMPERATURE_BY_MODE: Record<
  'conservative' | 'balanced' | 'aggressive',
  { default: number; analysis: number }
> = {
  conservative: { default: 0.15, analysis: 0.1 },
  balanced: { default: 0.25, analysis: 0.2 },
  aggressive: { default: 0.35, analysis: 0.25 },
};
