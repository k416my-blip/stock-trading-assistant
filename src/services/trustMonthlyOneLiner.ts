/**
 * AI信託 — 「今月の一言」表示用（investmentCharter の approvalReasons から生成・判定ロジック不変）
 */
import type { AllocationPlan } from '../types';
import type { TrustProfileTypeLabel } from '../constants/trustDisplay';
import type { TrustExpectedRiskLevel } from './trustRecommendationSummary';

const JARGON_PATTERN =
  /PER|PBR|RSI|ADX|MACD|Malaysia v4|v4一致率|憲章|decisionHash|Red Team|OpenAI|adoptionVerdict|buyAllowed|recommendationEngine|investmentCharter|technical|fundamental|audit|スコア|confidencePct|recommendationScore|\bconfidence\b|\bBUY\b|\bHOLD\b|\bREJECT\b|投資|株|売買|委員会|AI投資委員会|テクニカル|ファンダ|データ不足|ニュース:|ネガティブ|ポジティブ/gi;

const MIN_LEN = 20;
const MAX_LEN = 50;

function sanitizeReason(text: string): string {
  return text
    .replace(JARGON_PATTERN, '')
    .replace(/[·・:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampOneLiner(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_LEN) return trimmed;
  const cut = trimmed.slice(0, MAX_LEN - 1);
  const lastComma = Math.max(cut.lastIndexOf('、'), cut.lastIndexOf('。'));
  if (lastComma >= MIN_LEN - 5) return cut.slice(0, lastComma + 1);
  return `${cut}…`;
}

function ensureMinLength(text: string, fallback: string): string {
  if (text.length >= MIN_LEN) return clampOneLiner(text);
  const joined = text.endsWith('。') ? `${text}${fallback}` : `${text}。${fallback}`;
  if (joined.length >= MIN_LEN) return clampOneLiner(joined);
  return clampOneLiner(fallback);
}

export function collectCharterApprovalReasonsFromPlan(plan: AllocationPlan): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of plan.candidates) {
    const reasons = candidate.recommendationMeta?.charterApprovalReasonsJa ?? [];
    for (const reason of reasons) {
      const key = reason.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

function profileFallback(profileTypeLabel: TrustProfileTypeLabel): string {
  if (profileTypeLabel === '安定型') {
    return '今月は安定型を中心に、無理のない配分を提案します';
  }
  if (profileTypeLabel === '積極型') {
    return '今月は積極型を中心に、成長を意識した配分を提案します';
  }
  return '今月は標準型を中心に、バランスの取れた配分を提案します';
}

function detectThemedOneLiner(
  combined: string,
  riskLevel: TrustExpectedRiskLevel,
): string | null {
  if (/半導体|semi|テック|technology|chip/i.test(combined)) {
    return '半導体関連の比重を引き上げた、今月の配分案です';
  }
  if (/配当|dividend|高配当|インカム/i.test(combined)) {
    return '配当を中心に、安定した配分案に変更しました';
  }
  if (
    riskLevel === '高' ||
    /ボラ|変動|過熱|下落|不安|守り|慎重|リスク/i.test(combined)
  ) {
    return '市場変動が大きいため、守り重視の配分にしています';
  }
  if (/成長|growth|伸び/i.test(combined)) {
    return '成長が期待できる銘柄の比重を高める配分です';
  }
  if (/安定|安全|堅実|defensive/i.test(combined)) {
    return '今月は安定型を中心に、無理のない配分を提案します';
  }
  return null;
}

function reasonToOneLiner(reason: string): string | null {
  const clean = sanitizeReason(reason);
  if (clean.length < 6) return null;

  if (/^[ぁ-んァ-ン一-龥a-zA-Z0-9].+[。]$/.test(clean) && clean.length >= MIN_LEN && clean.length <= MAX_LEN) {
    return clean;
  }

  const wrapped = clean.endsWith('。') ? clean : `${clean}を踏まえた配分です`;
  if (wrapped.length >= MIN_LEN && wrapped.length <= MAX_LEN) return wrapped;
  if (wrapped.length > MAX_LEN) return clampOneLiner(wrapped);
  return null;
}

export function buildTrustMonthlyOneLinerJa(input: {
  approvalReasonsJa: string[];
  profileTypeLabel?: TrustProfileTypeLabel;
  expectedRiskLevel?: TrustExpectedRiskLevel;
}): string {
  const profileTypeLabel = input.profileTypeLabel ?? '標準型';
  const expectedRiskLevel = input.expectedRiskLevel ?? '中';
  const sanitized = input.approvalReasonsJa.map(sanitizeReason).filter(Boolean);
  const combined = sanitized.join(' ');

  const themed = detectThemedOneLiner(combined, expectedRiskLevel);
  if (themed) return ensureMinLength(themed, profileFallback(profileTypeLabel));

  for (const reason of sanitized) {
    const line = reasonToOneLiner(reason);
    if (line) return line;
  }

  return profileFallback(profileTypeLabel);
}
