/**
 * 4アナリスト + Red Team の集計メトリクス（判定権なし）
 */
import type { AdoptionVerdict } from '../types/investmentCharter';

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s、。・]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2),
  );
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.flatMap((line) => [...tokenSet(line)]));
  let hits = 0;
  let total = 0;
  for (const line of a) {
    for (const token of tokenSet(line)) {
      total += 1;
      if (setB.has(token)) hits += 1;
    }
  }
  if (total === 0) return 0;
  return hits / total;
}

/** 4アナリスト（賛成・反対・リスク・Red Team）の lockedVerdict 方向一致率 */
export function computeCommitteeConsensusPct(input: {
  lockedVerdict: AdoptionVerdict;
  bullCaseJa: string[];
  bearCaseJa: string[];
  riskFactorsJa: string[];
  counterArgumentsJa: string[];
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
}): number {
  const bullAlign = overlapRatio(input.bullCaseJa, input.charterApprovalReasonsJa);
  const bearAlign = overlapRatio(input.bearCaseJa, input.charterOppositionReasonsJa);

  if (input.lockedVerdict === 'adopt') {
    return clampPct(
      bullAlign * 45 +
        bearAlign * 10 +
        (input.riskFactorsJa.length > 0 ? 20 : 8) +
        (input.counterArgumentsJa.length > 0 ? 25 : 12),
    );
  }
  if (input.lockedVerdict === 'reject') {
    return clampPct(
      bearAlign * 45 +
        bullAlign * 10 +
        (input.riskFactorsJa.length > 0 ? 20 : 8) +
        (input.counterArgumentsJa.length > 0 ? 25 : 12),
    );
  }
  return clampPct(
    bullAlign * 22 +
      bearAlign * 22 +
      (input.riskFactorsJa.length > 0 ? 28 : 12) +
      (input.counterArgumentsJa.length > 0 ? 28 : 16),
  );
}

export function computeRedTeamScore(input: {
  counterArgumentsJa: string[];
  lockedVerdict: AdoptionVerdict;
  charterOppositionReasonsJa: string[];
  aiRedTeamScore?: number | null;
}): number {
  if (
    input.aiRedTeamScore != null &&
    Number.isFinite(input.aiRedTeamScore) &&
    input.aiRedTeamScore >= 0 &&
    input.aiRedTeamScore <= 100
  ) {
    return clampPct(input.aiRedTeamScore);
  }

  const countScore = Math.min(100, input.counterArgumentsJa.length * 28);
  const lengthScore = Math.min(
    40,
    input.counterArgumentsJa.reduce((sum, line) => sum + line.length, 0) / 8,
  );
  const overlap = overlapRatio(input.counterArgumentsJa, input.charterOppositionReasonsJa) * 20;
  const verdictBoost = input.lockedVerdict === 'adopt' ? 12 : input.lockedVerdict === 'reject' ? 8 : 5;
  return clampPct(countScore + lengthScore + overlap + verdictBoost);
}

/** AI委員会信頼度 — 判定ハッシュ対象外 */
export function computeCommitteeTrustPct(input: {
  confidencePct: number;
  recommendationScore: number;
  committeeConsensusPct: number;
  redTeamScore: number;
}): number {
  const base =
    input.confidencePct * 0.35 +
    input.recommendationScore * 0.25 +
    input.committeeConsensusPct * 0.4;
  const penalty = input.redTeamScore * 0.12;
  return clampPct(base - penalty);
}

export function formatStrongOppositionLabel(redTeamScore: number): string {
  return redTeamScore >= 65 ? 'あり' : 'なし';
}

export function applyCommitteeMetrics<T extends {
  adoptionVerdict: AdoptionVerdict;
  confidencePct: number;
  recommendationScore: number;
  bullCaseJa: string[];
  bearCaseJa: string[];
  riskFactorsJa: string[];
  counterArgumentsJa: string[];
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
  redTeamScore?: number;
}>(meta: T, aiRedTeamScore?: number | null): T & {
  committeeConsensusPct: number;
  redTeamScore: number;
  committeeTrustPct: number;
  strongOppositionLabelJa: string;
} {
  const committeeConsensusPct = computeCommitteeConsensusPct({
    lockedVerdict: meta.adoptionVerdict,
    bullCaseJa: meta.bullCaseJa,
    bearCaseJa: meta.bearCaseJa,
    riskFactorsJa: meta.riskFactorsJa,
    counterArgumentsJa: meta.counterArgumentsJa,
    charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
    charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
  });
  const redTeamScore = computeRedTeamScore({
    counterArgumentsJa: meta.counterArgumentsJa,
    lockedVerdict: meta.adoptionVerdict,
    charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
    aiRedTeamScore: aiRedTeamScore ?? meta.redTeamScore,
  });
  const committeeTrustPct = computeCommitteeTrustPct({
    confidencePct: meta.confidencePct,
    recommendationScore: meta.recommendationScore,
    committeeConsensusPct,
    redTeamScore,
  });
  return {
    ...meta,
    committeeConsensusPct,
    redTeamScore,
    committeeTrustPct,
    strongOppositionLabelJa: formatStrongOppositionLabel(redTeamScore),
  };
}
