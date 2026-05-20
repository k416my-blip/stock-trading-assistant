import { describe, expect, it } from 'vitest';
import { createAssistantChatMessage, getInitialAiChatMessages } from '../../src/data/mockAiChat';
import { getConciergeInstantAnswer } from '../../src/services/aiConciergeInstantAnswers';
import {
  resolveConciergeConversationMode,
  stripConciergeBoilerplateFromText,
} from '../../src/services/aiConciergeConversationMode';
import { buildDisplayText, sanitizeAiText } from '../../src/services/aiResponseSanitizer';
import { classifyConciergeResponseIntent } from '../../src/services/aiConciergeResponseIntent';

describe('aiConciergeConversationQuality', () => {
  it('answers glossary without analysis template labels', () => {
    const msg = getConciergeInstantAnswer('リスクオフの意味は？');
    expect(msg).not.toBeNull();
    expect(msg?.text).toContain('リスクオフ');
    expect(msg?.text).not.toContain('理由:');
    expect(msg?.text).not.toContain('最終判断はユーザー自身');
    expect(msg?.structured).toBeUndefined();
    expect(msg?.conversationMode).toBe('conversation');
  });

  it('answers watchlist theme with named companies', () => {
    const msg = getConciergeInstantAnswer('注目銘柄は？');
    expect(msg?.text).toMatch(/NVIDIA|TSMC|Microsoft|1155/i);
    expect(msg?.text).not.toContain('半導体関連です');
    expect(msg?.text).not.toContain('注目銘柄はありません');
    expect(msg?.structured).toBeUndefined();
  });

  it('does not append safety footer in conversation sanitize mode', () => {
    const out = sanitizeAiText('今は様子見です。', { appendSafetyFooter: false });
    expect(out).not.toContain('最終判断はユーザー自身');
  });

  it('strips boilerplate labels from model echo', () => {
    const cleaned = stripConciergeBoilerplateFromText(
      '結論です。\n確認事項: 証券画面を見る\nリスク: 高い\n最終判断はユーザー自身が行ってください。',
    );
    expect(cleaned).not.toMatch(/確認事項:|^リスク:/m);
    expect(cleaned).not.toContain('最終判断はユーザー自身');
  });

  it('conversation buildDisplayText omits 確認事項 prefix', () => {
    const text = buildDisplayText(
      { body: '半導体に注目しています。' },
      {
        reason: 'x',
        risk: 'y',
        market: 'z',
        urgency: '低',
        confidence: '60%',
        dataFreshness: 'fresh',
        followUp: '価格を確認',
      },
      'conversation',
    );
    expect(text).toBe('半導体に注目しています。');
    expect(text).not.toContain('確認事項:');
  });

  it('uses warning mode only when system topic under degraded context', () => {
    const intent = classifyConciergeResponseIntent('API接続状態は？');
    expect(intent).toBe('system_status');
    const mode = resolveConciergeConversationMode({
      intent,
      userMessage: 'API接続状態は？',
      degradedMode: true,
    });
    expect(mode).toBe('warning');
  });

  it('keeps normal chat in conversation mode when not degraded', () => {
    const mode = resolveConciergeConversationMode({
      intent: 'general_education',
      userMessage: 'リスクオフとは？',
      degradedMode: false,
    });
    expect(mode).toBe('conversation');
  });

  it('does not repeat identical template between glossary and buy mock', () => {
    const a = getConciergeInstantAnswer('リスクオフとは？');
    const b = createAssistantChatMessage('なぜ買い推奨？');
    expect(a?.text).not.toBe(b.text);
    expect(b.text).not.toContain('理由:');
    expect(b.structured).toBeUndefined();
  });

  it('welcome message is conversational without structured block', () => {
    const [welcome] = getInitialAiChatMessages();
    expect(welcome.structured).toBeUndefined();
    expect(welcome.text).not.toContain('最終判断はユーザー自身');
    expect(welcome.conversationMode).toBe('conversation');
  });

  it('detailed analysis request enables analysis mode on buy FAQ', () => {
    const msg = getConciergeInstantAnswer('なぜ買い推奨？ 詳細分析で');
    expect(msg?.conversationMode).toBe('analysis');
    expect(msg?.structured).toBeDefined();
  });
});
