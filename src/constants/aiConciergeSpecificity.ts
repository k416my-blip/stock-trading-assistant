/** Rules and reference lists for concrete, entity-first concierge answers. */

export const AI_ANSWER_QUALITY_RULE_JA =
  'ユーザーが具体例（企業名・銘柄・セクター名・国名など）を求めたとき、広いカテゴリだけで答えてはならない。必ず固有名詞を先に列挙する。';

export const AI_SPECIFICITY_PROMPT_BLOCK_JA = [
  '回答品質（必須）:',
  AI_ANSWER_QUALITY_RULE_JA,
  '応答順序: 1=直接回答（固有名詞を最初に） 2=短い説明 3=任意の理由。',
  '企業名・銘柄・競合・テーマ・推奨・例を求められたら、NVIDIA、TSMC、1155 のように明示的な名称を複数挙げる。セクター名だけで終わらない。',
  '「具体的に？」「例えば？」「どういう意味？」と聞かれたら、直前の話題を具体名で展開する（elaboration）。',
  '直前と同じ曖昧な言い回しを繰り返さない。簡潔に（深掘り指定時のみ長く）。',
].join('\n');

/** Illustrative watchlist names for mock/instant paths — not live recommendations. */
export const AI_THEME_REFERENCE_COMPANIES_JA = {
  aiInfrastructure: ['NVIDIA（NVDA）', 'AMD（AMD）', 'TSMC（2330）', 'Broadcom（AVGO）'],
  aiPlatform: ['Microsoft（MSFT）', 'Alphabet（GOOGL）', 'Amazon（AMZN）', 'Meta（META）'],
  domestic: ['マレー銀行（1155）'],
} as const;

const ALL_REFERENCE_COMPANY_NAMES = [
  ...AI_THEME_REFERENCE_COMPANIES_JA.aiInfrastructure,
  ...AI_THEME_REFERENCE_COMPANIES_JA.aiPlatform,
  ...AI_THEME_REFERENCE_COMPANIES_JA.domestic,
];

export function formatAiCompanyWatchlistAnswerJa(): string {
  return `AI関連で注目している会社名は、${ALL_REFERENCE_COMPANY_NAMES.join('、')}です。半導体はAIチップ需要、ハイパースケーラーはクラウドAI投資、国内は金利サイクル確認用です。`;
}

export function formatGeneralWatchlistAnswerJa(): string {
  return `具体名で言うと、半導体は NVIDIA・TSMC・AMD、ハイパースケーラーは Microsoft・Alphabet・Amazon・Meta、国内ではマレー銀行（1155）をウォッチしています。`;
}
