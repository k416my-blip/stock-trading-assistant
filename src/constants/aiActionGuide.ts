import type { AiActionCategory, MarketStance, NotificationPriorityTier } from '../types/conciergeActionGuide';

/** 出来高急増: 直近5日平均の3倍以上 */
export const ACTION_VOLUME_SURGE_RATIO = 3;

/** ネガティブ投稿比率の警戒 */
export const ACTION_NEGATIVE_BEARISH_PCT = 70;

export const ACTION_INSUFFICIENT_DATA_LABEL_JA = '判断材料不足';

export const AI_ACTION_CATEGORY_LABELS_JA: Record<AiActionCategory, string> = {
  watch: '様子見',
  caution: '注意',
  panic: 'パニック警戒',
  opportunity: '機会',
  'profit-taking': '利確検討',
  'high-risk': '高リスク',
  'unusual-volume': '出来高異常',
  'rumor-alert': '噂・投稿警戒',
};

export const MARKET_STANCE_LABELS_JA: Record<MarketStance, string> = {
  bullish: '強気',
  neutral: '中立',
  bearish: '弱気',
};

export const NOTIFICATION_PRIORITY_LABELS_JA: Record<NotificationPriorityTier, string> = {
  critical: '緊急',
  high: '高',
  medium: '中',
  low: '低',
};

export const EVIDENCE_SCORE_LABELS_JA: Record<
  import('../types/conciergeActionGuide').EvidenceScoreKey,
  string
> = {
  priceAction: 'price action',
  volume: 'volume',
  news: 'news',
  xSentiment: 'X sentiment',
  volatility: 'volatility',
};

export const AI_ACTION_GUIDE_PROMPT_JA = `【投資行動支援 — context.evidenceData.actionGuide】
各銘柄の actionGuide を参照し、ユーザーが次に何をすべきかを整理して答える。
出力は可能なら次の構造に沿う（数値は actionGuide / 材料分析のみ引用。創作禁止）:

1. 銘柄名 2. 現在株価 3. 保有株数 4. 評価額 5. 含み損益
6. 総合判定（強い買い / 買い / 中立 / 売り / 強い売り）
7. 確信度 0〜100%
8. 判断理由（Bursa / News API / X API / Reddit の材料要約を含む）
9. ポジティブ材料 10. ネガティブ材料 11. リスク 12. 次に確認すべきポイント
13. AI推奨アクション（追加購入 / 保有継続 / 一部利確 / 全利確 / 監視のみ）
14. ソース別スコア（Bursa / News / X / Reddit）15. 総合スコア 0〜100

市場状況: 強気 / 中立 / 弱気（actionGuide.marketStanceLabelJa）
理由: 箇条書き（reasonBulletsJa）
推奨: 箇条書き（recommendedActionsJa）
AI確信度: actionGuide.confidencePct（0〜100%）

データ不足（insufficientData=true）のときは推測せず「判断材料不足」と明示する。`;
