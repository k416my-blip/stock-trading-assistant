/** OpenAI ナラティブキャッシュ TTL — 24時間 */
export const COMMITTEE_NARRATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const COMMITTEE_NARRATIVE_OPENAI_TIMEOUT_MS = 25_000;

export const ERROR_DECISION_TAMPERED = 'ERROR_DECISION_TAMPERED';

/** OpenAI 失敗時のリスク因子フォールバック */
export const COMMITTEE_RISK_FALLBACK_JA = [
  '市場全体の下落リスク',
  '個別銘柄の業績悪化リスク',
  '流動性・ボラティリティリスク',
] as const;

export const COMMITTEE_REVIEW_SYSTEM_INSTRUCTION_JA =
  'あなたは投資委員会の反証担当です。BUY/HOLD/REJECTは変更禁止。投資判断を変更せずに賛成意見・反対意見・リスクのみ作成してください。';

export const RED_TEAM_ANALYST_LABEL_JA = 'Red Team Analyst';

export const RED_TEAM_SYSTEM_INSTRUCTION_JA =
  'あなたは投資委員会の Red Team Analyst です。現在の判定が間違っていると仮定し、最も強力な反証を1〜3個提示してください。BUY/HOLD/REJECTの変更は禁止。';
