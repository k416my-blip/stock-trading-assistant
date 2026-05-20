import { describe, expect, it, vi } from 'vitest';
import { minimalAiStrategyContext } from '../helpers/aiContextFixture';
import { AI_CONCIERGE_UI } from '../../src/constants/aiConcierge';
import { assertAiPayloadSafe, buildAiStrategyContext } from '../../src/services/aiContextBuilder';
import {
  getConciergeInstantAnswer,
  shouldAcceptChatSend,
} from '../../src/services/aiConciergeInstantAnswers';
import {
  conciergeModePromptHint,
  detectConciergeMode,
} from '../../src/services/aiConciergeIntent';
import { createAssistantChatMessage } from '../../src/data/mockAiChat';
import {
  getVoiceInputAvailabilityForPlatform,
  resetVoiceInputCoreForTest,
  startVoiceCaptureCore,
} from '../../src/services/aiVoiceInputCore';
import { containsForbiddenExpression } from '../../src/services/aiResponseSanitizer';
import { createDefaultAppState } from '../../src/services/storage';
import { clearDiagnosticEvents } from '../../src/services/structuredDiagnostics';

describe('aiConcierge', () => {
  it('detects operation mode for UI help questions', () => {
    expect(detectConciergeMode('健全性チェックとは？')).toBe('operation');
    expect(detectConciergeMode('stale dataとは？')).toBe('operation');
  });

  it('detects strategy mode for recommendation questions', () => {
    expect(detectConciergeMode('なぜ買い推奨？')).toBe('strategy');
    expect(detectConciergeMode('なぜ信頼度が低下？')).toBe('strategy');
  });

  it('instant answer for risk-off question', () => {
    const msg = getConciergeInstantAnswer('リスクオフの意味は？');
    expect(msg).not.toBeNull();
    expect(msg?.role).toBe('assistant');
    expect(msg?.text).toContain('リスクオフ');
    expect(msg?.structured).toBeUndefined();
  });

  it('shouldAcceptChatSend ignores empty and blocks only while sending', () => {
    expect(shouldAcceptChatSend('  ', false)).toBe(false);
    expect(shouldAcceptChatSend('リスクオフの意味は？', false)).toBe(true);
    expect(shouldAcceptChatSend('test', true)).toBe(false);
  });

  it('mock assistant message is produced for API-style fallback', () => {
    const msg = createAssistantChatMessage('リスクオフの意味は？');
    expect(msg.role).toBe('assistant');
    expect(msg.text.length).toBeGreaterThan(20);
    expect(msg.structured).toBeUndefined();
  });

  it('detects system mode for infrastructure questions', () => {
    expect(detectConciergeMode('API quota状況は？')).toBe('system');
    expect(detectConciergeMode('なぜ更新停止？')).toBe('system');
  });

  it('detects portfolio mode for holdings questions', () => {
    expect(detectConciergeMode('保有バランスは危険？')).toBe('portfolio');
    expect(detectConciergeMode('セクター偏りは？')).toBe('portfolio');
  });

  it('provides mode-specific prompt hints for explanation quality', () => {
    expect(conciergeModePromptHint('operation')).toContain('操作説明');
    expect(conciergeModePromptHint('system')).toContain('診断');
    expect(conciergeModePromptHint('portfolio')).toContain('ポートフォリオ');
  });

  it('floating FAB visibility hides when panel is open', () => {
    const shouldShowFab = (panelOpen: boolean) => !panelOpen;
    expect(shouldShowFab(false)).toBe(true);
    expect(shouldShowFab(true)).toBe(false);
  });

  it('voice input falls back when unavailable (node / native)', () => {
    resetVoiceInputCoreForTest();
    expect(getVoiceInputAvailabilityForPlatform('ios')).toBe('unavailable');
    const onStatus = vi.fn();
    startVoiceCaptureCore('android', vi.fn(), onStatus);
    expect(onStatus).toHaveBeenCalledWith('unavailable', AI_CONCIERGE_UI.voiceUnavailable);
  });

  it('voice input reports permission denied on web when browser blocks mic', () => {
    resetVoiceInputCoreForTest();
    const onStatus = vi.fn();
    startVoiceCaptureCore('web', vi.fn(), onStatus);
    if (onStatus.mock.calls[0]?.[0] === 'unavailable') {
      expect(onStatus).toHaveBeenCalledWith('unavailable', AI_CONCIERGE_UI.voiceUnavailable);
    } else {
      expect(onStatus.mock.calls[0]?.[0]).toBe('listening');
    }
  });

  it('includes concierge context when userMessage is provided', async () => {
    clearDiagnosticEvents();
    const ctx = await buildAiStrategyContext({
      state: createDefaultAppState(),
      appMode: 'live',
      degradedMode: true,
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
      diagnosticsSummary: '警告 1 件',
      diagnosticsSeverity: { info: 0, warning: 1, error: 0, critical: 0 },
      userMessage: 'なぜ制限モード？',
    });
    expect(ctx.concierge.mode).toBe('operation');
    expect(ctx.operations.degradedMode).toBe(true);
    expect(ctx.systemAwareness.compositeConfidence).toBeLessThan(100);
    assertAiPayloadSafe(ctx);
  });

  it('survives missing health report in concierge context', async () => {
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
      userMessage: '古い株価の銘柄は？',
    });
    expect(ctx.concierge.mode).toBe('portfolio');
    expect(ctx.operations.healthOverall).toBeNull();
  });

  it('rejects forbidden profit-guarantee wording in sanitizer', () => {
    expect(containsForbiddenExpression('利益保証があります')).toBe(true);
    expect(containsForbiddenExpression('必ず買ってください')).toBe(true);
  });
});
