import { AI_CONCIERGE_UI } from '../constants/aiConcierge';

export type VoiceInputStatus = 'idle' | 'listening' | 'unavailable' | 'permission_denied' | 'error';

type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

let activeWebRecognition: WebSpeechRecognition | null = null;

function getWebSpeechRecognitionCtor(): (new () => WebSpeechRecognition) | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

export function getVoiceInputAvailabilityForPlatform(platformOs: string): VoiceInputStatus {
  if (platformOs === 'web') {
    return getWebSpeechRecognitionCtor() ? 'idle' : 'unavailable';
  }
  return 'unavailable';
}

export function stopVoiceCaptureCore(): void {
  if (activeWebRecognition) {
    try {
      activeWebRecognition.abort();
    } catch {
      activeWebRecognition.stop();
    }
    activeWebRecognition = null;
  }
}

export function startVoiceCaptureCore(
  platformOs: string,
  onTranscript: (text: string) => void,
  onStatus: (status: VoiceInputStatus, messageJa?: string) => void,
): void {
  stopVoiceCaptureCore();

  if (platformOs === 'web') {
    const Ctor = getWebSpeechRecognitionCtor();
    if (!Ctor) {
      onStatus('unavailable', AI_CONCIERGE_UI.voiceUnavailable);
      return;
    }

    const recognition = new Ctor();
    activeWebRecognition = recognition;
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const first = event.results[0]?.[0]?.transcript?.trim();
      if (first) onTranscript(first);
    };

    recognition.onerror = (event) => {
      activeWebRecognition = null;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onStatus('permission_denied', AI_CONCIERGE_UI.voicePermissionDenied);
      } else {
        onStatus('error', AI_CONCIERGE_UI.voiceError);
      }
    };

    recognition.onend = () => {
      activeWebRecognition = null;
      onStatus('idle');
    };

    try {
      onStatus('listening');
      recognition.start();
    } catch {
      activeWebRecognition = null;
      onStatus('unavailable', AI_CONCIERGE_UI.voiceUnavailable);
    }
    return;
  }

  onStatus('unavailable', AI_CONCIERGE_UI.voiceUnavailable);
}

export function resetVoiceInputCoreForTest(): void {
  stopVoiceCaptureCore();
}
