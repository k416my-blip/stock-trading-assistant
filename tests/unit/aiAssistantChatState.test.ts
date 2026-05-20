import { describe, expect, it } from 'vitest';
import { AI_ERROR_API_KEY_MISSING } from '../../src/constants/aiStrategy';
import {
  isAiRequestInFlight,
  resolveIdleConnectionStatus,
  shouldShowApiSpinner,
  statusJaForRequestStatus,
} from '../../src/utils/aiAssistantChatState';
import type { AiRequestStatus } from '../../src/types/aiStrategy';

describe('aiAssistantChatState', () => {
  it('treats only in-flight statuses as active', () => {
    const inFlight: AiRequestStatus[] = [
      'checking_api_key',
      'connecting',
      'thinking',
      'waiting_response',
      'retrying',
      'reconnecting',
      'degraded',
      'streaming',
    ];
    for (const status of inFlight) {
      expect(isAiRequestInFlight(status)).toBe(true);
      expect(shouldShowApiSpinner(status, true)).toBe(true);
      expect(shouldShowApiSpinner(status, false)).toBe(false);
    }
    for (const status of ['idle', 'success', 'error', 'fallback_mock', 'timeout', 'api_key_missing'] as AiRequestStatus[]) {
      expect(isAiRequestInFlight(status)).toBe(false);
    }
  });

  it('resolves api_key_missing with required Japanese message', () => {
    const idle = resolveIdleConnectionStatus({
      aiEnabled: true,
      mockOnly: false,
      hasApiKey: false,
    });
    expect(idle.requestStatus).toBe('api_key_missing');
    expect(idle.errorJa).toBe(AI_ERROR_API_KEY_MISSING);
  });

  it('shows key_saved_unverified when key exists but connection not verified', () => {
    const idle = resolveIdleConnectionStatus({
      aiEnabled: true,
      mockOnly: false,
      hasApiKey: true,
    });
    expect(idle.statusJa).toBe('APIキー保存済み・未確認');
    expect(idle.requestStatus).toBe('idle');
  });

  it('maps terminal statuses for display', () => {
    expect(statusJaForRequestStatus('api_key_missing')).toBe('APIキー未設定');
    expect(statusJaForRequestStatus('timeout')).toBe('タイムアウト');
    expect(statusJaForRequestStatus('fallback_mock')).toBe('モック応答中');
    expect(statusJaForRequestStatus('thinking')).toBe('考え中…');
    expect(statusJaForRequestStatus('retrying')).toBe('再試行中…');
    expect(statusJaForRequestStatus('reconnecting')).toBe('再接続中…');
    expect(statusJaForRequestStatus('degraded')).toContain('劣化');
    expect(statusJaForRequestStatus('streaming')).toBe('回答を表示中…');
  });
});
