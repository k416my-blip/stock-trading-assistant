import { describe, expect, it } from 'vitest';
import { buildTestGlobalMarket } from '../helpers/macroMarketFixtures';
import { buildMacroIntelligenceBundle } from '../../src/services/macroIntelligenceEngine';
import {
  enhanceMetaDecisionInput,
  filterCandidatesByMacro,
} from '../../src/services/macroIntelligenceIntegration';
import { defaultMacroIntelligenceState } from '../../src/services/macroIntelligenceStorage';
import type { ProactiveSuggestionCandidate } from '../../src/types/proactiveSuggestion';

function panicMarket() {
  const base = buildTestGlobalMarket();
  return {
    ...base,
    regimeId: 'panic' as const,
    vix: {
      id: 'vix',
      labelJa: 'VIX',
      yahooSymbol: '^VIX',
      value: 34,
      changePct: 12,
      unitJa: 'pt',
      fromLive: false,
    },
    marketScores: {
      marketRiskScore: 88,
      fearScore: 82,
      momentumScore: 25,
      liquidityScore: 32,
    },
  };
}

function candidate(
  overrides: Partial<ProactiveSuggestionCandidate> = {},
): ProactiveSuggestionCandidate {
  return {
    priority: 'medium',
    category: 'buy_candidate',
    dedupeKey: 'buy:test',
    titleJa: '買い',
    bodyJa: 'body',
    actionHintJa: 'hint',
    source: 'test',
    ...overrides,
  };
}

describe('macroIntelligenceEngine', () => {
  it('classifies panic regime when VIX is extreme', () => {
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: panicMarket(),
    });
    expect(['panic', 'liquidity_crisis']).toContain(bundle.worldRegime.id);
    expect(bundle.integration.forceEmergencyMode).toBe(true);
    expect(bundle.integration.forceDefensiveStrategy).toBe(true);
  });

  it('detects liquidity stress from low liquidity score', () => {
    const g = panicMarket();
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: {
        ...g,
        vix: { ...g.vix!, value: 33 },
        marketScores: { ...g.marketScores, liquidityScore: 28 },
      },
    });
    expect(['panic', 'liquidity_crisis']).toContain(bundle.worldRegime.id);
    expect(bundle.liquidity.score).toBeGreaterThan(40);
  });

  it('activates AI narrative when semiconductor sector leads', () => {
    const base = buildTestGlobalMarket();
    const g = {
      ...base,
      sectors: base.sectors.map((s) =>
        s.id === 'semiconductor' ? { ...s, changePct: 2.5, momentumScore: 72 } : s,
      ),
      macroContextBulletsJa: ['AI半導体が牽引'],
    };
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: g,
    });
    const ai = bundle.narratives.find((n) => n.id === 'ai_boom');
    expect(ai?.active).toBe(true);
  });

  it('builds correlation matrix from global market', () => {
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: buildTestGlobalMarket(),
    });
    expect(bundle.correlations.length).toBeGreaterThan(0);
  });

  it('filterCandidatesByMacro suppresses routine buys in panic', () => {
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: panicMarket(),
    });
    const filtered = filterCandidatesByMacro(
      [
        candidate({ priority: 'medium', category: 'buy_candidate' }),
        candidate({ priority: 'critical', category: 'sharp_move' }),
      ],
      bundle,
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].priority).toBe('critical');
  });

  it('enhanceMetaDecisionInput raises emergency in macro stress', () => {
    const { bundle } = buildMacroIntelligenceBundle(defaultMacroIntelligenceState(), {
      globalMarket: panicMarket(),
    });
    const enhanced = enhanceMetaDecisionInput(
      {
        candidates: [],
        regimeId: 'bullish',
        marketRiskScore: 40,
        fearScore: 30,
        emergencyMode: false,
        symbolWeightPct: {},
        userStyleId: 'balanced_trader',
        evidenceBySymbol: {},
      },
      bundle,
    );
    expect(enhanced.emergencyMode).toBe(true);
    expect(enhanced.regimeId).toBe('panic');
    expect(enhanced.marketRiskScore).toBeGreaterThan(40);
  });
});
