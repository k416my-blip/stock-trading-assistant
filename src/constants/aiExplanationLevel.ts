/** AI concierge explanation depth — persisted as `aiExplanationLevel` */

export type AiExplanationLevel = 'advanced' | 'general' | 'high_school' | 'sell_side_md';

export const DEFAULT_AI_EXPLANATION_LEVEL: AiExplanationLevel = 'general';

export const AI_EXPLANATION_LEVEL_ORDER: readonly AiExplanationLevel[] = [
  'high_school',
  'general',
  'advanced',
  'sell_side_md',
] as const;

export function isAiExplanationLevel(value: unknown): value is AiExplanationLevel {
  return (
    value === 'advanced' ||
    value === 'general' ||
    value === 'high_school' ||
    value === 'sell_side_md'
  );
}

export const AI_EXPLANATION_LEVEL_LABELS_JA: Record<AiExplanationLevel, string> = {
  high_school: '初心者',
  general: '一般',
  advanced: '経験者',
  sell_side_md: '外資系証券MD',
};

export const AI_EXPLANATION_LEVEL_HINTS_JA: Record<AiExplanationLevel, string> = {
  high_school: '専門用語を避け、たとえ話で丁寧に説明する',
  general: '専門用語は使いつつ必要に応じて短く補足する（標準）',
  advanced: '専門用語を省略せず、回答はやや短めに要点を示す',
  sell_side_md: '外資系証券MDトーン。簡潔・論理的・マクロとフローを織り交ぜる',
};

/** Prompt block for API instructions — does not alter fixed personality traits */
export const AI_EXPLANATION_LEVEL_PROMPT_JA: Record<AiExplanationLevel, string> = {
  high_school: [
    '説明レベル: 初心者（high_school）',
    '専門用語はできるだけ避け、難しい言葉は必ず簡単に言い換える。',
    'たとえ話を使ってよい。回答は少し丁寧にする。',
    '人格（冷静・分析的・リスク重視・断定しすぎない・誇張しない）は変更しない。',
  ].join('\n'),
  general: [
    '説明レベル: 一般（general）',
    '専門用語は使ってよいが、初出や難語は必要に応じて1文で短く補足する。',
    '標準的な丁寧さで説明する。',
    '人格（冷静・分析的・リスク重視・断定しすぎない・誇張しない）は変更しない。',
  ].join('\n'),
  advanced: [
    '説明レベル: 経験者（advanced）',
    'PER・EPS・FOMC・金利・出来高・ボラティリティなど専門用語を省略せず使ってよい。',
    '回答はやや短め。判断材料を端的に示す。',
    '人格（冷静・分析的・リスク重視・断定しすぎない・誇張しない）は変更しない。',
  ].join('\n'),
  sell_side_md: [
    '説明レベル: 外資系証券MD（sell_side_md）',
    'ブル・ベア・フロー・ポジショニング・コンフィデンス・キャタリスト等を自然に使う。',
    '結論先出し、2〜4文で簡潔。マクロとセクター文脈を1フレーズで添える。',
    '人格（冷静・分析的・リスク重視・断定しすぎない・誇張しない）は変更しない。',
  ].join('\n'),
};
