import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isVoiceOutputSpeaking,
  resetVoiceOutputForTest,
  speakVoiceOutput,
  stopVoiceOutput,
} from '../../src/services/aiVoiceOutputService';

describe('aiVoiceOutputService', () => {
  beforeEach(() => {
    resetVoiceOutputForTest();
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class MockUtterance {
        lang = '';
        rate = 1;
        onend?: () => void;
        onerror?: () => void;
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks speaking while utterance is active until stop', async () => {
    await speakVoiceOutput('最初の文です。', { rate: 1 });
    expect(isVoiceOutputSpeaking()).toBe(true);
    await stopVoiceOutput();
    expect(isVoiceOutputSpeaking()).toBe(false);
  });

  it('ignores empty text', async () => {
    await speakVoiceOutput('   ', { rate: 1 });
    expect(isVoiceOutputSpeaking()).toBe(false);
  });
});
