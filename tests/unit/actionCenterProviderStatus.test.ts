import { describe, expect, it } from 'vitest';
import {
  isHybridPipelineActive,
  resolveActionCenterProviderStatuses,
  resolveNewsApiDisplayStatus,
  resolveTwelveDataDisplayStatus,
} from '../../src/services/actionCenterProviderStatus';
import type { StrategyExecutionBundle } from '../../src/types/strategyExecution';

function minimalBundle(source: string): StrategyExecutionBundle {
  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: 'balanced',
    regimeStrategyJa: 'test',
    todayRecommendations: [],
    dangerAvoid: [],
    watchList: [],
    highExpectancy: [],
    allocation: {
      recommendedCashRatioPct: 15,
      cashRatioRationaleJa: '',
      sectorBalanceJa: '',
      concentrationJa: '',
    },
    cooldownNoteJa: null,
    hybridSecondEvaluator: {
      generatedAt: new Date().toISOString(),
      source,
      symbolCount: 3,
      ruleWeightPct: 70,
      aiWeightPct: 30,
    },
  } as unknown as StrategyExecutionBundle;
}

describe('actionCenterProviderStatus', () => {
  it('marks Twelve and News as 実行済み when batchSource is hybrid', () => {
    const bundle = minimalBundle('openai');
    const statuses = resolveActionCenterProviderStatuses({
      bundle,
      batchSource: 'hybrid',
    });
    expect(statuses.twelveDataStatus).toBe('実行済み');
    expect(statuses.newsApiStatus).toBe('実行済み');
    expect(statuses.openAiStatus).toBe('実行済み');
  });

  it('marks Twelve and News as 未実行 when no hybrid and no manual test', () => {
    const twelve = resolveTwelveDataDisplayStatus({
      batchSource: 'rule_only',
      rawHybridSource: 'none',
    });
    const news = resolveNewsApiDisplayStatus({
      batchSource: 'rule_only',
      rawHybridSource: 'none',
    });
    expect(twelve.labelJa).toBe('未実行');
    expect(news.labelJa).toBe('未実行');
  });

  it('isHybridPipelineActive for openai raw source', () => {
    expect(isHybridPipelineActive('hybrid', 'openai')).toBe(true);
    expect(isHybridPipelineActive('rule_only', 'openai')).toBe(true);
    expect(isHybridPipelineActive('rule_only', 'none')).toBe(false);
  });
});
