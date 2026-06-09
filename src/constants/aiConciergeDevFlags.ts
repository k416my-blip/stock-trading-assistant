import { ACTION_CENTER_LOGS } from '../utils/devLog';

/**
 * AI Concierge / Proactive を一時無効化する開発フラグ。
 * Provider を外す場合は、useProactiveConcierge / useAiConcierge を呼ぶ UI も必ず非表示にする。
 */
export const DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST = false;

/** 開発ビルドで重い AI / 診断を軽量化しているときの UI 表示用 */
export const DEV_LIGHTWEIGHT_MODE =
  typeof __DEV__ !== 'undefined' && __DEV__;

/**
 * Metro OOM 切り分け: AI Action Center（Portfolio Score + 接続テスト）のみ。
 * true のとき proactive 全層ビルドとダッシュボード eager import をスキップ。
 */
export const AI_ACTION_CENTER_LITE_MODE =
  typeof __DEV__ !== 'undefined' && __DEV__;

/** 軽量モードで hybrid OpenAI バッチをスキップ（REAL_API_MODE 時は常に hybrid 実行） */
export const AI_ACTION_CENTER_LITE_SKIP_HYBRID = false;

/** AI Action Center を設定トグルに関係なく表示（Expo Go 実機でも portfolio 評価 UI を確認可能） */
export const FORCE_SHOW_AI_ACTION_CENTER = true;

/** AI Action Center の表示ゲート・評価メトリクス（EXPO_PUBLIC_ACTION_CENTER_LOGS=1 のみ） */
export const AI_ACTION_CENTER_DEBUG_LOG = ACTION_CENTER_LOGS;

/** 実機が最新 JS を読んでいるか確認するための UI バージョン（Action Center フッターに表示） */
export const PORTFOLIO_AI_EVAL_UI_VERSION = 'portfolio-ai-eval-v2';
