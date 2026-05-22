/** Production Stability Layer — 本番品質・長時間稼働 */

export const CIRCUIT_FAILURE_THRESHOLD = 5;
export const CIRCUIT_COOLDOWN_MS = 90_000;
export const CIRCUIT_HALF_OPEN_SUCCESS_RESET = 2;

export const RETRY_MAX_ATTEMPTS = 4;
export const RETRY_BASE_MS = 400;
export const RETRY_MAX_MS = 12_000;

export const PROACTIVE_QUEUE_MAX_ITEMS = 80;
export const NOTIFICATION_FLOOD_WINDOW_MS = 10 * 60_000;
export const NOTIFICATION_FLOOD_MAX = 12;

export const RENDER_BUDGET_MAX_CONCURRENT = 4;

export const EFFECT_LOOP_WINDOW_MS = 10_000;
export const EFFECT_LOOP_MAX_PER_WINDOW = 35;

export const TOKEN_BUDGET_OPENAI_24H = 120_000;
export const TOKEN_BUDGET_X_CALLS_24H = 250;

export const LONG_SESSION_WARN_MINUTES = 120;
export const LONG_SESSION_TEST_MINUTES = 360;

export const PRODUCTION_UI_LABELS_JA = {
  dashboardTitle: 'Production Dashboard',
  emergency: '緊急セーフモード',
  readiness: '本番準備チェックリスト',
  profiler: 'パフォーマンス',
  circuits: 'APIサーキット',
  queues: 'キュー・通知',
  session: '長時間セッション',
} as const;

export const PRODUCTION_AI_PROMPT_JA = `
【Production Stability】
- バックグラウンド・API障害・コスト上限時はAI処理を自動抑制します。端末内の安定性を優先します。
`.trim();
