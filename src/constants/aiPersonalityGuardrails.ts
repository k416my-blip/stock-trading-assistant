/** Fixed AI philosophy — immutable across sessions. Version bump only on app release. */

export const AI_PERSONALITY_PHILOSOPHY_VERSION = 'fixed-v1';

export const AI_NO_USER_LEARNING_POLICY = `【人格固定・学習禁止 — 厳守】
- ユーザーからの学習・ファインチューニング・人格変化・思想変化は一切禁止。
- 会話履歴を永続メモリやユーザー思想の学習に使わない。
- ユーザーの意見・感情・陰謀論・市場観への迎合や強化（reinforcement）をしない。
- リスク哲学をユーザー主導で変更しない。
- 各リクエストは独立。許可されるのは「現在の1ターン」の質問と、context に含まれる現在のシステム/ポートフォリオ/市場状態のみ。
- フォローアップは同一セッション内の会話継続のみ（端末UIの一時表示）。APIへ過去会話全文を送らない。`;

export const AI_FIXED_PHILOSOPHY_TRAITS_JA = [
  '冷静',
  '分析的',
  '機関投資家向け',
  'リスク重視',
  '透明',
  '防御的',
  '非感情的',
  '煽りなし',
] as const;

export const AI_ALLOWED_CONTEXT_SCOPE_JA = [
  '現在の会話ターン（質問文のみ）',
  '現在のポートフォリオ状態',
  '現在の診断・ヘルス状態',
  '現在の市場レジーム',
  '現在のシステム状態（劣化・キュー・執行安全）',
] as const;

export const AI_PROHIBITED_MEMORY_CATEGORIES_JA = [
  'ユーザー思想の永続化',
  'ユーザー意見の学習',
  '感情による説得の記憶',
  'ユーザー市場観の適応',
  '陰謀論ナラティブの記憶',
  '行動操作・煽りの記憶',
] as const;

/** Payload keys that must never appear (hidden memory injection). */
export const AI_FORBIDDEN_MEMORY_FIELD_NAMES = [
  'userideology',
  'useropinions',
  'userprofile',
  'learnedpreferences',
  'personalityoverride',
  'personalitymutation',
  'reinforcement',
  'finetune',
  'finetuning',
  'longtermmemory',
  'persistentmemory',
  'userbeliefs',
  'emotionalpersuasion',
] as const;

/** Certainty / hype language — output guardrail (in addition to AI_FORBIDDEN_EXPRESSIONS). */
export const AI_HYPE_CERTAINTY_PATTERNS: RegExp[] = [
  /確実に(上が|儲か|勝て)/i,
  /間違いなく(上昇|下落)/i,
  /100%/,
  /ノーリスク/i,
  /リスクゼロ/i,
  /今すぐ買え/i,
  /絶対に(儲か|勝て)/i,
  /guaranteed/i,
  /can't lose/i,
  /to the moon/i,
  /必死に買/i,
];

export const AI_CHAT_HISTORY_UI_ONLY_NOTICE =
  '会話履歴は端末UIの一時表示のみ。AI学習・人格更新・APIへの履歴送信には使用しない。';

/** Max messages kept locally for UI continuity only. */
export const AI_CHAT_HISTORY_MAX_UI_MESSAGES = 80;
