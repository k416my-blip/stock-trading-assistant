/** 総合スコアの内訳ウェイト（合計100%） */
export const RECOMMENDATION_WEIGHTS = {
  technical: 0.25,
  fundamental: 0.25,
  news: 0.15,
  earnings: 0.15,
  sns: 0.1,
  risk: 0.1,
} as const;

export const RECOMMENDATION_DISCLAIMER =
  '本スコアは参考用の分析目安です。将来の株価や利益を保証するものではありません。実際の注文はRakuten Tradeでご自身が確認してください。';

export const AI_LEARNING_DISCLAIMER =
  '端末内の過去データで重みを少しずつ調整しています。AIによる確実な予測ではありません。';

export const DATA_UNAVAILABLE_LABEL = 'データ未取得';

export const DATA_SOURCE_LABELS: Record<'available' | 'unavailable' | 'estimated', string> = {
  available: '取得済み',
  unavailable: '未取得',
  estimated: '参考推定',
};
