/** 実データ分析型 AI コンシェルジュ */

export const NEWS_CACHE_TTL_MS = 30 * 60 * 1000;

export const QUOTE_EVIDENCE_FRESH_MS = 5 * 60 * 1000;

export const CONCIERGE_SHARP_DROP_PCT = -5;

/** @deprecated 投資行動支援は ACTION_VOLUME_SURGE_RATIO(3) を使用 */
export const CONCIERGE_VOLUME_SURGE_RATIO = 3;

export const CONCIERGE_NEGATIVE_POST_SURGE_PCT = 40;

export const CONCIERGE_NEGATIVE_BEARISH_PCT = 70;

export type AiAnalysisMode = 'conservative' | 'balanced' | 'aggressive';

export const AI_ANALYSIS_MODE_ORDER: readonly AiAnalysisMode[] = [
  'conservative',
  'balanced',
  'aggressive',
];

export const AI_ANALYSIS_MODE_LABELS_JA: Record<AiAnalysisMode, string> = {
  conservative: '保守的',
  balanced: 'バランス',
  aggressive: '積極的',
};

export const AI_ANALYSIS_MODE_HINTS_JA: Record<AiAnalysisMode, string> = {
  conservative:
    '根拠データのみ述べ、不確実な因果は避ける。リスク・データ不足を先に明示。',
  balanced:
    '数値・ニュース・Xセンチメントを引用しつつ、推測と事実を区別する。',
  aggressive:
    '急変フラグ・出来高・投稿急増を優先して短く指摘。根拠が無い推測は禁止のまま。',
};

export const AI_DATA_DRIVEN_PROMPT_JA = `【実データ分析モード — 必須】
context.evidenceData に銘柄ごとの市場データ・ニュース・Xセンチメント・異常フラグがあります。回答は必ずこの数値・見出し・投稿傾向を引用してください。

禁止（単独・繰り返しの汎用句）:
- 「様々な要因」「様々な理由」だけで終える
- 「可能性があります」「かもしれません」だけで因果を説明する（根拠数値なし）
- データに無い銘柄・数値の創作

必須（引用できるとき）:
- 現在値・前日終値・日中変化率（%）
- 出来高または出来高急増倍率
- ニュース見出し（1件以上、可能なら）
- X: bear%/bull%、投稿数、トレンド語、ネガ急増・投稿急増フラグ
- unusualActivityFlags があればその内容

データ不足時:
- 推測しない。必ず「原因を特定できません」と明示し、不足したデータ種別（例: ニュース未取得、Xキャッシュなし）を述べる。

分析モードは context.analysisMode に従う（conservative / balanced / aggressive）。

context.evidenceData.actionGuide に行動カテゴリ・確信度・推奨行動・通知理由があります。投資行動の整理には actionGuide を優先し、判断材料不足のときは「判断材料不足」と明示する。`;

export const AI_VAGUE_ANSWER_PATTERNS: RegExp[] = [
  /^様々な要因/,
  /様々な要因.*(です|ます)[。.]?$/,
  /^可能性があります[。.]?$/,
  /様々な理由.*(です|ます)[。.]?$/,
];

export const AI_INSUFFICIENT_DATA_PHRASE_JA = '原因を特定できません';
