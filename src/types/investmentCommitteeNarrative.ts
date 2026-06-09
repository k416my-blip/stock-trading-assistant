export type CommitteeReview = {
  bullCaseJa: string[];
  bearCaseJa: string[];
  riskFactorsJa: string[];
  generatedAt: string;
};

export type RedTeamReview = {
  counterArgumentsJa: string[];
  redTeamScore: number;
  generatedAt: string;
};

/** @deprecated CommitteeReview を使用 */
export type CommitteeNarrative = CommitteeReview;

export type NarrativeCacheStatus = 'hit' | 'miss';

export type CommitteeReviewFetchResult = {
  review: CommitteeReview;
  cacheStatus: NarrativeCacheStatus;
  apiCalled: boolean;
};

export type RedTeamReviewFetchResult = {
  review: RedTeamReview;
  cacheStatus: NarrativeCacheStatus;
  apiCalled: boolean;
};

/** @deprecated CommitteeReviewFetchResult を使用 */
export type CommitteeNarrativeFetchResult = CommitteeReviewFetchResult;

export class DecisionTamperedError extends Error {
  readonly code = 'ERROR_DECISION_TAMPERED';

  readonly decisionHashBefore: string;

  readonly decisionHashAfter: string;

  constructor(decisionHashBefore: string, decisionHashAfter: string) {
    super('ERROR_DECISION_TAMPERED');
    this.name = 'DecisionTamperedError';
    this.decisionHashBefore = decisionHashBefore;
    this.decisionHashAfter = decisionHashAfter;
  }
}

export type RecommendationEnrichmentAudit = {
  decisionHashBefore: string;
  decisionHashAfter: string;
  narrativeCacheStatus: NarrativeCacheStatus;
  bullCaseCount: number;
  bearCaseCount: number;
  riskFactorCount: number;
  counterArgumentCount: number;
  redTeamCacheStatus?: NarrativeCacheStatus;
};
