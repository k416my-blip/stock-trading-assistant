import { describe, expect, it } from 'vitest';
import { createAssistantChatMessage } from '../../src/data/mockAiChat';
import { getConciergeInstantAnswer } from '../../src/services/aiConciergeInstantAnswers';
import { classifyConciergeResponseIntent } from '../../src/services/aiConciergeResponseIntent';
import { shouldShowStructuredForMode } from '../../src/services/aiConciergeConversationMode';

describe('aiConciergeResponseFormat', () => {
  it('classifies risk-off as general_education', () => {
    expect(classifyConciergeResponseIntent('リスクオフの意味は？')).toBe('general_education');
  });

  it('classifies buy recommendation questions as investment_analysis', () => {
    expect(classifyConciergeResponseIntent('なぜ買い推奨？')).toBe('investment_analysis');
    expect(classifyConciergeResponseIntent('この銘柄は買い？')).toBe('investment_analysis');
  });

  it('classifies portfolio balance as portfolio_review', () => {
    expect(classifyConciergeResponseIntent('保有バランスは危険？')).toBe('portfolio_review');
  });

  it('risk-off instant answer is short without structured template', () => {
    const msg = getConciergeInstantAnswer('リスクオフの意味は？');
    expect(msg).not.toBeNull();
    expect(msg?.responseIntent).toBe('general_education');
    expect(shouldShowStructuredForMode('conversation')).toBe(false);
    expect(msg?.structured).toBeUndefined();
    expect(msg?.text).toContain('リスクオフ');
    expect(msg?.text).not.toContain('理由:');
    expect(msg?.text.split('\n').length).toBeLessThan(6);
  });

  it('buy recommendation mock is conversational without structured template by default', () => {
    const msg = createAssistantChatMessage('なぜ買い推奨？');
    expect(msg.responseIntent).toBe('investment_analysis');
    expect(msg.structured).toBeUndefined();
    expect(msg.conversationMode).toBe('conversation');
    expect(msg.text).not.toContain('最終判断はユーザー自身');
  });

  it('buy recommendation with detailed analysis uses structured template', () => {
    const msg = createAssistantChatMessage('なぜ買い推奨？ 詳細分析で');
    expect(msg.conversationMode).toBe('analysis');
    expect(msg.structured).toBeDefined();
    expect(shouldShowStructuredForMode('analysis')).toBe(true);
  });

});
