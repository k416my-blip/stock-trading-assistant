/**
 * 投資委員長（AIコンシェルジュ）× 投資憲章 による推奨審議
 */
import {
  AI_CONCIERGE_INVESTMENT_CHAIR_JA,
  CHARTER_MIN_BUY_CONFIDENCE_PCT,
  CHARTER_MIN_BUY_SCORE,
  CHARTER_MIN_APPROVAL_REASONS,
  COMMITTEE_DECISION_HIERARCHY_JA,
  INVESTMENT_PHILOSOPHY_SUMMARY_JA,
  OPPOSITION_FALLBACK_JA,
  USER_FINAL_APPROVAL_NOTE_JA,
} from '../constants/investmentCharter';
import {
  MALAYSIA_V4_REFERENCE_SYMBOLS,
  MALAYSIA_V4_REFERENCE_WEIGHTS,
  type MalaysiaV4ReferenceSymbol,
} from '../constants/malaysiaV4Reference';
import type { ConciergeSymbolActionGuide } from '../types/conciergeActionGuide';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { CharterEvaluationResult } from '../types/investmentCharter';
import type { AdoptionVerdict } from '../types/investmentCharter';
import type { StockRecommendation } from '../types/recommendation';
import {
  buildCharterFullRationaleJa,
  evaluateInvestmentCharter,
  scoreCharterQualitySignals,
} from './investmentCharterEvaluation';
import { computeDecisionHash } from './recommendationDecisionHash';
import { buildFallbackCommitteeReview, buildFallbackRedTeamReview } from './investmentCommitteeReviewFallback';
import { applyCommitteeMetrics } from './investmentCommitteeMetrics';
import { buildBeginnerReasonJa } from './beginnerRecommendationSummary';
import { mapVerdictToCardRecommendation } from './beginnerDisplayMapper';
import { normalizeSymbolKey } from './userAnalysisSymbols';

export type { AdoptionVerdict } from '../types/investmentCharter';

export type RecommendationConfidenceLevel = 'high' | 'medium' | 'low';

export type NarrativeSource = 'rule' | 'openai';

export type AllocationRecommendationMeta = {
  recommenderJa: string;
  investmentPhilosophyJa: string;
  /** UI表示用（OpenAI enrichment 後は差替） */
  approvalReasonsJa: string[];
  oppositionReasonsJa: string[];
  /** 憲章判定専用 — OpenAI 非使用 */
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
  confidencePct: number;
  confidenceLevel: RecommendationConfidenceLevel;
  confidenceLabelJa: string;
  recommendationScore: number;
  malaysiaV4AlignmentPct: number;
  adoptionVerdict: AdoptionVerdict;
  adoptionLabelJa: string;
  buyAllowed: boolean;
  /** SHA256(symbol+verdict+buyAllowed+score+confidence) — 監査専用 */
  decisionHash: string;
  charterVersion: string;
  charterEvaluation: CharterEvaluationResult;
  fullRationaleJa: string;
  decisionHierarchyJa: string;
  userApprovalNoteJa: string;
  riskExplanationJa: string | null;
  committeeMinutesJa: string | null;
  /** OpenAI 賛成アナリスト出力（UI表示） */
  bullCaseJa: string[];
  /** OpenAI 反対アナリスト出力（UI表示） */
  bearCaseJa: string[];
  /** OpenAI リスクアナリスト出力（UI表示） */
  riskFactorsJa: string[];
  /** Red Team Analyst — 判定への反証（decisionHash 対象外） */
  counterArgumentsJa: string[];
  redTeamScore: number;
  committeeConsensusPct: number;
  committeeTrustPct: number;
  strongOppositionLabelJa: string;
  /** 初心者向け理由（3行以内） */
  beginnerReasonJa: string;
  narrativeSource: NarrativeSource;
  narrativeGeneratedAt: string | null;
  redTeamGeneratedAt: string | null;
};

const CONFIDENCE_LABEL: Record<RecommendationConfidenceLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const BEARISH_CATEGORIES = new Set(['panic', 'high-risk', 'rumor-alert', 'caution']);

function uniqueReasons(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function isMalaysiaV4Symbol(symbol: string): boolean {
  const core = normalizeSymbolKey(symbol);
  return (MALAYSIA_V4_REFERENCE_SYMBOLS as readonly string[]).includes(core);
}

export function computeMalaysiaV4AlignmentPct(symbol: string, allocationPct: number): number {
  const core = normalizeSymbolKey(symbol) as MalaysiaV4ReferenceSymbol;
  const target = MALAYSIA_V4_REFERENCE_WEIGHTS[core];
  if (target == null || allocationPct <= 0) return 0;
  const diff = Math.abs(allocationPct - target);
  return Math.round(Math.max(0, 100 - (diff / target) * 100) * 10) / 10;
}

export function resolveRecommendationConfidence(
  rec: StockRecommendation,
  conciergeGuide?: ConciergeSymbolActionGuide,
): { level: RecommendationConfidenceLevel; labelJa: string; pct: number } {
  let pct: number;
  if (conciergeGuide && !conciergeGuide.insufficientData && conciergeGuide.reasonBulletsJa.length > 0) {
    pct = conciergeGuide.confidencePct;
  } else {
    pct = rec.totalScore;
  }

  if (pct >= 75) return { level: 'high', labelJa: CONFIDENCE_LABEL.high, pct };
  if (pct >= CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    return { level: 'medium', labelJa: CONFIDENCE_LABEL.medium, pct };
  }
  return { level: 'low', labelJa: CONFIDENCE_LABEL.low, pct };
}

export function buildCharterApprovalReasons(input: {
  rec: StockRecommendation;
  selectionReason: string;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
  malaysiaV4AlignmentPct: number;
  symbol: string;
}): string[] {
  const reasons: string[] = [];
  const qualitySignals = scoreCharterQualitySignals({
    rec: input.rec,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
  });

  for (const signal of qualitySignals) {
    if (signal.matched) reasons.push(signal.labelJa);
  }

  if (input.rec.whyThisStock?.trim()) reasons.push(input.rec.whyThisStock.trim());
  if (input.selectionReason?.trim()) reasons.push(input.selectionReason.trim());

  if (input.conciergeGuide && !input.conciergeGuide.insufficientData) {
    const bullish =
      input.conciergeGuide.marketStance === 'bullish' ||
      input.conciergeGuide.primaryCategory === 'opportunity';
    for (const bullet of input.conciergeGuide.reasonBulletsJa) {
      if (bullish || !BEARISH_CATEGORIES.has(input.conciergeGuide.primaryCategory)) {
        reasons.push(bullet);
      }
    }
  }

  if (isMalaysiaV4Symbol(input.symbol) && input.malaysiaV4AlignmentPct >= 70) {
    reasons.push(`Malaysia v4一致率 ${input.malaysiaV4AlignmentPct.toFixed(1)}%`);
  }

  const posNews = input.conciergeEvidence?.latestFinancialNews.filter(
    (h) => h.sentiment === 'ポジティブ',
  );
  if (posNews?.length) {
    reasons.push(`ポジティブニュース: ${posNews[0].title.slice(0, 36)}`);
  }

  return uniqueReasons(reasons).slice(0, 8);
}

export function buildCharterOppositionReasons(input: {
  rec: StockRecommendation;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
  confidencePct: number;
}): string[] {
  const reasons: string[] = [];

  for (const caution of input.rec.cautions) {
    if (caution?.trim()) reasons.push(caution.trim());
  }

  if (input.conciergeGuide) {
    reasons.push(...input.conciergeGuide.attentionPointsJa);
    if (input.conciergeGuide.riskSummaryJa?.trim()) {
      reasons.push(input.conciergeGuide.riskSummaryJa.trim());
    }
    const bearish =
      input.conciergeGuide.marketStance === 'bearish' ||
      BEARISH_CATEGORIES.has(input.conciergeGuide.primaryCategory);
    if (bearish) {
      for (const bullet of input.conciergeGuide.reasonBulletsJa) reasons.push(bullet);
    }
  }

  if (input.conciergeEvidence?.dataGapsJa.length) {
    reasons.push(`データ不足: ${input.conciergeEvidence.dataGapsJa.join(' · ')}`);
  }

  const negNews = input.conciergeEvidence?.latestFinancialNews.filter(
    (h) => h.sentiment === 'ネガティブ',
  );
  if (negNews?.length) {
    reasons.push(`ネガティブニュース: ${negNews[0].title.slice(0, 36)}`);
  }

  if (input.rec.totalScore < CHARTER_MIN_BUY_SCORE) {
    reasons.push(`総合スコア ${input.rec.totalScore}/100 — 憲章基準未満`);
  }
  if (input.confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    reasons.push(`信頼度 ${Math.round(input.confidencePct)}% — 憲章基準未満`);
  }
  if (input.rec.technical.score < 45 && input.rec.technical.score > 0) {
    reasons.push('短期過熱・テクニカル面の懸念');
  }

  const unique = uniqueReasons(reasons);
  if (unique.length === 0) unique.push(OPPOSITION_FALLBACK_JA);
  return unique.slice(0, 8);
}

export function buildAllocationRecommendationMeta(input: {
  symbol: string;
  name?: string;
  rec: StockRecommendation;
  selectionReason: string;
  allocationPct: number;
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): AllocationRecommendationMeta {
  const malaysiaV4AlignmentPct = computeMalaysiaV4AlignmentPct(input.symbol, input.allocationPct);
  const confidence = resolveRecommendationConfidence(input.rec, input.conciergeGuide);
  const charterApprovalReasonsJa = buildCharterApprovalReasons({
    rec: input.rec,
    selectionReason: input.selectionReason,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
    malaysiaV4AlignmentPct,
    symbol: input.symbol,
  });
  const charterOppositionReasonsJa = buildCharterOppositionReasons({
    rec: input.rec,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
    confidencePct: confidence.pct,
  });
  const approvalReasonsJa = [...charterApprovalReasonsJa];
  const oppositionReasonsJa = [...charterOppositionReasonsJa];

  const charterEvaluation = evaluateInvestmentCharter({
    approvalReasonsJa: charterApprovalReasonsJa,
    oppositionReasonsJa: charterOppositionReasonsJa,
    confidencePct: confidence.pct,
    rec: input.rec,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
  });

  const fullRationaleJa = buildCharterFullRationaleJa({
    symbol: input.symbol,
    name: input.name,
    recommenderJa: AI_CONCIERGE_INVESTMENT_CHAIR_JA,
    philosophyJa: INVESTMENT_PHILOSOPHY_SUMMARY_JA,
    approvalReasonsJa,
    oppositionReasonsJa,
    confidencePct: Math.round(confidence.pct),
    score: input.rec.totalScore,
    malaysiaV4AlignmentPct,
    verdictLabelJa: charterEvaluation.verdictLabelJa,
    qualitySignals: charterEvaluation.qualitySignals,
    holdReasonsJa: charterEvaluation.holdReasonsJa,
    rejectReasonsJa: charterEvaluation.rejectReasonsJa,
    dataFetchIssuesJa: charterEvaluation.dataFetchIssuesJa,
  });

  charterEvaluation.fullRationaleJa = fullRationaleJa;

  const confidencePct = Math.round(confidence.pct);
  const decisionHash = computeDecisionHash({
    symbol: input.symbol,
    adoptionVerdict: charterEvaluation.verdict,
    buyAllowed: charterEvaluation.buyEligible,
    recommendationScore: input.rec.totalScore,
    confidencePct,
  });

  const fallbackReview = buildFallbackCommitteeReview({
    charterApprovalReasonsJa,
    charterOppositionReasonsJa,
  });
  const fallbackRedTeam = buildFallbackRedTeamReview({
    lockedVerdict: charterEvaluation.verdict,
    charterApprovalReasonsJa,
    charterOppositionReasonsJa,
  });

  const metricsBase = {
    adoptionVerdict: charterEvaluation.verdict,
    buyAllowed: charterEvaluation.buyEligible,
    confidencePct,
    recommendationScore: input.rec.totalScore,
    bullCaseJa: fallbackReview.bullCaseJa,
    bearCaseJa: fallbackReview.bearCaseJa,
    riskFactorsJa: fallbackReview.riskFactorsJa,
    counterArgumentsJa: fallbackRedTeam.counterArgumentsJa,
    charterApprovalReasonsJa,
    charterOppositionReasonsJa,
    redTeamScore: fallbackRedTeam.redTeamScore,
  };
  const metrics = applyCommitteeMetrics(metricsBase, fallbackRedTeam.redTeamScore);
  const rec = mapVerdictToCardRecommendation({
    adoptionVerdict: charterEvaluation.verdict,
    buyAllowed: charterEvaluation.buyEligible,
  });
  const todayJudgment = rec.key === 'buy' ? 'buy' : rec.key === 'hold' ? 'wait' : 'skip';
  const beginnerReasonJa = buildBeginnerReasonJa({
    name: input.name,
    todayJudgment,
    bullCaseJa: fallbackReview.bullCaseJa,
    bearCaseJa: fallbackReview.bearCaseJa,
    riskFactorsJa: fallbackReview.riskFactorsJa,
  });

  return {
    recommenderJa: AI_CONCIERGE_INVESTMENT_CHAIR_JA,
    investmentPhilosophyJa: INVESTMENT_PHILOSOPHY_SUMMARY_JA,
    approvalReasonsJa,
    oppositionReasonsJa,
    charterApprovalReasonsJa,
    charterOppositionReasonsJa,
    confidencePct,
    confidenceLevel: confidence.level,
    confidenceLabelJa: confidence.labelJa,
    recommendationScore: input.rec.totalScore,
    malaysiaV4AlignmentPct,
    adoptionVerdict: charterEvaluation.verdict,
    adoptionLabelJa: charterEvaluation.verdictLabelJa,
    buyAllowed: charterEvaluation.buyEligible,
    decisionHash,
    charterVersion: charterEvaluation.charterVersion,
    charterEvaluation,
    fullRationaleJa,
    decisionHierarchyJa: COMMITTEE_DECISION_HIERARCHY_JA,
    userApprovalNoteJa: USER_FINAL_APPROVAL_NOTE_JA,
    riskExplanationJa: null,
    committeeMinutesJa: null,
    bullCaseJa: fallbackReview.bullCaseJa,
    bearCaseJa: fallbackReview.bearCaseJa,
    riskFactorsJa: fallbackReview.riskFactorsJa,
    counterArgumentsJa: fallbackRedTeam.counterArgumentsJa,
    redTeamScore: metrics.redTeamScore,
    committeeConsensusPct: metrics.committeeConsensusPct,
    committeeTrustPct: metrics.committeeTrustPct,
    strongOppositionLabelJa: metrics.strongOppositionLabelJa,
    beginnerReasonJa,
    narrativeSource: 'rule',
    narrativeGeneratedAt: null,
    redTeamGeneratedAt: null,
  };
}

export function isAdoptableRecommendation(meta: AllocationRecommendationMeta): boolean {
  return meta.adoptionVerdict === 'adopt' && meta.buyAllowed;
}

export function evaluateCommitteeAdoption(input: {
  rec: StockRecommendation;
  approvalReasonsJa: string[];
  oppositionReasonsJa: string[];
  conciergeGuide?: ConciergeSymbolActionGuide;
  conciergeEvidence?: ConciergeSymbolEvidence;
}): AdoptionVerdict {
  const confidence = resolveRecommendationConfidence(input.rec, input.conciergeGuide);
  return evaluateInvestmentCharter({
    approvalReasonsJa: input.approvalReasonsJa,
    oppositionReasonsJa: input.oppositionReasonsJa,
    confidencePct: confidence.pct,
    rec: input.rec,
    conciergeGuide: input.conciergeGuide,
    conciergeEvidence: input.conciergeEvidence,
  }).verdict;
}

export function conciergeRankBonus(
  _symbol: string,
  guide?: ConciergeSymbolActionGuide,
  rec?: StockRecommendation,
): number {
  if (!rec || rec.totalScore < CHARTER_MIN_BUY_SCORE) return 0;
  if (!guide || guide.insufficientData) return 0;
  if (BEARISH_CATEGORIES.has(guide.primaryCategory)) return -15;
  if (guide.confidencePct >= CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    return 25 + guide.confidencePct * 0.2;
  }
  return 0;
}

export function malaysiaV4ReferenceRankBonus(symbol: string): number {
  return isMalaysiaV4Symbol(symbol) ? 2 : 0;
}

export function findConciergeGuideForSymbol(
  symbol: string,
  guides: ConciergeSymbolActionGuide[] | undefined,
): ConciergeSymbolActionGuide | undefined {
  if (!guides?.length) return undefined;
  const core = normalizeSymbolKey(symbol);
  return guides.find((g) => normalizeSymbolKey(g.symbol) === core);
}

export function findConciergeEvidenceForSymbol(
  symbol: string,
  evidence: ConciergeSymbolEvidence[] | undefined,
): ConciergeSymbolEvidence | undefined {
  if (!evidence?.length) return undefined;
  const core = normalizeSymbolKey(symbol);
  return evidence.find((e) => normalizeSymbolKey(e.symbol) === core);
}

export function metaToAuditEntry(
  meta: AllocationRecommendationMeta,
  input: {
    symbol: string;
    name?: string;
    context: 'allocation_plan' | 'stock_detail' | 'screener';
    enrichmentAudit?: import('../types/investmentCommitteeNarrative').RecommendationEnrichmentAudit;
  },
): Omit<import('../types/investmentCharter').RecommendationAuditEntry, 'id' | 'timestamp'> {
  const enrichment = input.enrichmentAudit;
  return {
    symbol: input.symbol,
    name: input.name,
    context: input.context,
    decision: meta.adoptionVerdict,
    decisionLabelJa: meta.adoptionLabelJa,
    score: meta.recommendationScore,
    confidencePct: meta.confidencePct,
    reasons: meta.approvalReasonsJa,
    counterReasons: meta.oppositionReasonsJa,
    malaysiaV4AlignmentPct: meta.malaysiaV4AlignmentPct,
    charterVersion: meta.charterVersion,
    qualitySignalsMatched: meta.charterEvaluation.qualitySignals
      .filter((s) => s.matched)
      .map((s) => s.labelJa),
    decisionHash: meta.decisionHash,
    decisionHashBefore: enrichment?.decisionHashBefore ?? meta.decisionHash,
    decisionHashAfter: enrichment?.decisionHashAfter ?? meta.decisionHash,
    ...(enrichment
      ? {
          narrativeCacheHit: enrichment.narrativeCacheStatus === 'hit',
          narrativeCacheMiss: enrichment.narrativeCacheStatus === 'miss',
          bullCaseCount: enrichment.bullCaseCount,
          bearCaseCount: enrichment.bearCaseCount,
          riskFactorCount: enrichment.riskFactorCount,
          counterArgumentCount: enrichment.counterArgumentCount,
          redTeamCacheHit: enrichment.redTeamCacheStatus === 'hit',
          redTeamCacheMiss: enrichment.redTeamCacheStatus === 'miss',
        }
      : {
          bullCaseCount: meta.bullCaseJa.length,
          bearCaseCount: meta.bearCaseJa.length,
          riskFactorCount: meta.riskFactorsJa.length,
          counterArgumentCount: meta.counterArgumentsJa.length,
        }),
  };
}
