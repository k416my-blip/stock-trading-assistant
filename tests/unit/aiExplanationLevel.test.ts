import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../../src/constants/aiExplanationLevel';
import { getConciergeInstantAnswer } from '../../src/services/aiConciergeInstantAnswers';
import { loadAiPreferences, saveAiPreferences } from '../../src/services/aiPreferencesStorage';
import {
  assertFixedPersonalityImmutable,
  buildFixedAiInstructions,
} from '../../src/services/aiPersonalityGuard';
import { buildAiStrategyContext } from '../../src/services/aiContextBuilder';
import { minimalAiStrategyContext } from '../helpers/aiContextFixture';
import { createDefaultAppState } from '../../src/services/storage';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      storage.delete(key);
      return Promise.resolve();
    },
  },
}));

describe('aiExplanationLevel', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('defaults to general when preferences are missing', async () => {
    const prefs = await loadAiPreferences();
    expect(prefs.aiExplanationLevel).toBe(DEFAULT_AI_EXPLANATION_LEVEL);
    expect(prefs.aiExplanationLevel).toBe('general');
  });

  it('persists explanation level changes', async () => {
    await saveAiPreferences({ aiExplanationLevel: 'advanced' });
    const loaded = await loadAiPreferences();
    expect(loaded.aiExplanationLevel).toBe('advanced');

    await saveAiPreferences({ aiExplanationLevel: 'high_school' });
    const reloaded = await loadAiPreferences();
    expect(reloaded.aiExplanationLevel).toBe('high_school');
  });

  it('includes explanation level in AI strategy context payload', async () => {
    const ctx = await buildAiStrategyContext({
      state: createDefaultAppState(),
      appMode: 'live',
      degradedMode: false,
      bootMode: 'normal',
      securityWarnings: [],
      recoveryRecommendations: [],
      killSwitches: {
        version: 1,
        readOnlyMode: false,
        disableMarketRefresh: false,
        disableTradeSubmission: false,
      },
      priceSync: { loading: false, marketClosedHint: false },
      diagnosticsSummary: null,
      diagnosticsSeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      aiExplanationLevel: 'advanced',
    });
    expect(ctx.explanationLevel.aiExplanationLevel).toBe('advanced');
    expect(ctx.explanationLevel.promptHintJa).toContain('専門用語を省略せず');
  });

  it('passes explanation level into API instructions', () => {
    const advanced = buildFixedAiInstructions('advanced');
    expect(advanced).toContain('経験者（advanced）');
    expect(advanced).toContain('PER');

    const highSchool = buildFixedAiInstructions('high_school');
    expect(highSchool).toContain('初心者（high_school）');
    expect(highSchool).toContain('言い換える');

    const md = buildFixedAiInstructions('sell_side_md');
    expect(md).toContain('外資系証券MD');
    expect(md).toContain('フロー');
  });

  it('advanced instant FAQ allows specialist terms for risk-off', () => {
    const msg = getConciergeInstantAnswer('リスクオフの意味は？', 'advanced');
    expect(msg?.text).toContain('リスク資産');
    expect(msg?.text).toContain('債券');
  });

  it('high_school instant FAQ uses plain language for risk-off', () => {
    const msg = getConciergeInstantAnswer('リスクオフの意味は？', 'high_school');
    expect(msg?.text).toContain('避難');
    expect(msg?.text).not.toContain('リスク資産');
  });

  it('personality guardrails remain fixed when explanation level varies', () => {
    const advancedCtx = minimalAiStrategyContext({
      explanationLevel: {
        aiExplanationLevel: 'advanced',
        labelJa: '経験者',
        promptHintJa: 'test',
      },
    });
    const highSchoolCtx = minimalAiStrategyContext({
      explanationLevel: {
        aiExplanationLevel: 'high_school',
        labelJa: '初心者',
        promptHintJa: 'test',
      },
    });
    expect(() => assertFixedPersonalityImmutable(advancedCtx)).not.toThrow();
    expect(() => assertFixedPersonalityImmutable(highSchoolCtx)).not.toThrow();
    expect(advancedCtx.personality.toneGuidelinesJa).toEqual(highSchoolCtx.personality.toneGuidelinesJa);
  });
});
