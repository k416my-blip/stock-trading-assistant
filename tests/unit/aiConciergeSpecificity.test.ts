import { describe, expect, it } from 'vitest';
import { getConciergeInstantAnswer } from '../../src/services/aiConciergeInstantAnswers';
import { resolveConciergeConversationMode } from '../../src/services/aiConciergeConversationMode';
import {
  extractEntitiesFromText,
  isVagueCategoryOnlyAnswer,
  userRequestsNamedEntities,
  userWantsElaboration,
} from '../../src/services/aiConciergeEntityExtraction';
import { buildAiStrategyContext } from '../../src/services/aiContextBuilder';
import { createDefaultAppState } from '../../src/services/storage';

describe('aiConciergeSpecificity', () => {
  it('answers AI company-name questions with explicit entities', () => {
    const msg = getConciergeInstantAnswer('AI関連で注目している会社名は？');
    expect(msg).not.toBeNull();
    expect(msg?.text).toMatch(/NVIDIA|Microsoft|Alphabet|TSMC|AMD/i);
    expect(msg?.text).not.toMatch(/^半導体関連です[。.]?$/);
    expect(isVagueCategoryOnlyAnswer(msg?.text ?? '', true)).toBe(false);
  });

  it('watchlist FAQ lists company names not only sectors', () => {
    const msg = getConciergeInstantAnswer('注目銘柄は？');
    expect(msg?.text).toMatch(/NVIDIA|Microsoft|1155/i);
    expect(msg?.text).not.toContain('半導体関連です');
  });

  it('detects elaboration triggers in Japanese', () => {
    expect(userWantsElaboration('具体的に？')).toBe(true);
    expect(userWantsElaboration('例えば？')).toBe(true);
    expect(userWantsElaboration('どういう意味？')).toBe(true);
    expect(resolveConciergeConversationMode({
      intent: 'general_education',
      userMessage: '例えば？',
    })).toBe('elaboration');
  });

  it('detects named-entity requests', () => {
    expect(userRequestsNamedEntities('競合他社は？')).toBe(true);
    expect(userRequestsNamedEntities('おすすめ銘柄を教えて')).toBe(true);
    expect(userRequestsNamedEntities('リスクオフとは？')).toBe(false);
  });

  it('extracts tickers and company names from text', () => {
    const entities = extractEntitiesFromText('NVDAとマレー銀行、半導体セクター、マレーシア');
    expect(entities.tickers).toContain('NVDA');
    expect(entities.companyNames).toContain('マレー銀行');
    expect(entities.sectors).toContain('半導体');
    expect(entities.countries).toContain('マレーシア');
  });

  it('flags vague category-only answers when names were requested', () => {
    expect(isVagueCategoryOnlyAnswer('半導体関連です。', true)).toBe(true);
    expect(
      isVagueCategoryOnlyAnswer('NVIDIA、TSMC、AMD をウォッチしています。', true),
    ).toBe(false);
  });

  it('includes answerQuality in AI context payload', async () => {
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
      userMessage: 'AI関連の会社名を教えて',
    });
    expect(ctx.concierge.answerQuality.requestsNamedEntities).toBe(true);
    expect(ctx.concierge.answerQuality.specificityHintJa).toContain('具体名');
  });
});
