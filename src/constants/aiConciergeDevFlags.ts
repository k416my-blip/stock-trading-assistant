/**
 * AI Concierge / Proactive を一時無効化する開発フラグ。
 * Provider を外す場合は、useProactiveConcierge / useAiConcierge を呼ぶ UI も必ず非表示にする。
 */
export const DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST = false;

/** 開発ビルドで重い AI / 診断を軽量化しているときの UI 表示用 */
export const DEV_LIGHTWEIGHT_MODE =
  typeof __DEV__ !== 'undefined' && __DEV__;

/** 戦略バンドルがあれば AI Action Center を必ず描画（設定トグルを一時バイパス） */
export const FORCE_SHOW_AI_ACTION_CENTER =
  typeof __DEV__ !== 'undefined' && __DEV__;

/** AI Action Center の表示ゲート・評価メトリクスを console に出力 */
export const AI_ACTION_CENTER_DEBUG_LOG =
  typeof __DEV__ !== 'undefined' && __DEV__;
