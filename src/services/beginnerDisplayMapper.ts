/**
 * 投資配分UI — 初心者向け文言変換（表示層のみ・判定ロジック不変）
 */
import type { AdoptionVerdict } from '../types/investmentCharter';
import type { InvestmentDisplayMode } from '../types/investmentDisplay';
import type { RecommendationConfidenceLevel } from './recommendationProvenance';

const JARGON_PATTERN =
  /PER|PBR|RSI|ADX|MACD|Malaysia v4|憲章|decisionHash|Red Team|OpenAI|adoptionVerdict|buyAllowed|recommendationEngine|investmentCharter|technical|fundamental|audit|スコア|confidencePct/gi;

export type BeginnerRecommendationKey = 'buy' | 'hold' | 'skip';

export function resolveInvestmentDisplayMode(
  prefs: {
    investmentDisplayMode?: InvestmentDisplayMode;
    investmentBeginnerMode?: boolean;
  } | null | undefined,
): InvestmentDisplayMode {
  if (
    prefs?.investmentDisplayMode === 'pro' ||
    prefs?.investmentDisplayMode === 'beginner' ||
    prefs?.investmentDisplayMode === 'trust'
  ) {
    return prefs.investmentDisplayMode;
  }
  return prefs?.investmentBeginnerMode === false ? 'pro' : 'trust';
}

export function isTrustDisplayMode(prefs: Parameters<typeof resolveInvestmentDisplayMode>[0]): boolean {
  return resolveInvestmentDisplayMode(prefs) === 'trust';
}

export function isBeginnerDisplayMode(
  prefs: Parameters<typeof resolveInvestmentDisplayMode>[0],
): boolean {
  return resolveInvestmentDisplayMode(prefs) === 'beginner';
}

export function isProDisplayMode(prefs: Parameters<typeof resolveInvestmentDisplayMode>[0]): boolean {
  return resolveInvestmentDisplayMode(prefs) === 'pro';
}

/** 監査ログ非表示・簡易ホーム対象（信託・初心者） */
export function isSimplifiedInvestmentDisplayMode(
  prefs: Parameters<typeof resolveInvestmentDisplayMode>[0],
): boolean {
  const mode = resolveInvestmentDisplayMode(prefs);
  return mode === 'trust' || mode === 'beginner';
}

/** カード表示用: 買う / 保留 / 見送る */
export function mapVerdictToCardRecommendation(input: {
  adoptionVerdict: AdoptionVerdict;
  buyAllowed: boolean;
}): { key: BeginnerRecommendationKey; labelJa: string } {
  if (input.adoptionVerdict === 'adopt' && input.buyAllowed) {
    return { key: 'buy', labelJa: '買う' };
  }
  if (input.adoptionVerdict === 'hold') {
    return { key: 'hold', labelJa: '保留' };
  }
  return { key: 'skip', labelJa: '見送る' };
}

/** 内部ラベル変換（BUY/HOLD/REJECT 相当） */
export function mapVerdictToBeginnerPhrase(input: {
  adoptionVerdict: AdoptionVerdict;
  buyAllowed: boolean;
}): string {
  if (input.adoptionVerdict === 'adopt' && input.buyAllowed) return '買ってもよい候補';
  if (input.adoptionVerdict === 'hold') return '今は待つ';
  return '買わない';
}

export function mapScoreToGradeLabel(recommendationScore: number): 'A' | 'B' | 'C' | 'D' {
  if (recommendationScore >= 80) return 'A';
  if (recommendationScore >= 65) return 'B';
  if (recommendationScore >= 50) return 'C';
  return 'D';
}

export function mapConfidenceToCertaintyLabel(
  level: RecommendationConfidenceLevel,
): '高' | '中' | '低' {
  if (level === 'high') return '高';
  if (level === 'medium') return '中';
  return '低';
}

export function sanitizeBeginnerText(text: string, maxLen = 56): string {
  return text
    .replace(JARGON_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeBeginnerLines(lines: string[], maxItems = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const cleaned = sanitizeBeginnerText(line);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** 詳しく見る — 自然文（専門語なし） */
export function buildBeginnerNaturalExplanation(input: {
  name: string;
  recommendationPhrase: string;
  reasons: string[];
  cautions: string[];
}): string {
  const who = input.name.trim() || 'この銘柄';
  const positive = input.reasons[0] ?? '最近の状況から候補に入っています';
  const caution = input.cautions[0] ?? '価格が上下する可能性があります';

  if (input.recommendationPhrase === '買わない') {
    return `${who}は、今は買わない方がよさそうです。${caution}があるため、様子を見るのが安心です。`;
  }
  if (input.recommendationPhrase === '今は待つ') {
    return `${who}は、今すぐ買わず様子を見るのがおすすめです。良い点は「${positive}」ですが、「${caution}」にも注意が必要です。`;
  }
  return `${who}は「${positive}」などの理由から、今の候補に入っています。ただし短期的には「${caution}」の可能性もあるので、無理のない金額で考えてください。`;
}
