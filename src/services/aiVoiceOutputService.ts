export type VoiceOutputOptions = {
  language?: string;
  rate?: number;
  onDone?: () => void;
  onStopped?: () => void;
};

let speaking = false;
let currentUtteranceId: string | null = null;

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[「」]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canUseWebSpeech(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

export function isVoiceOutputSpeaking(): boolean {
  return speaking;
}

export async function stopVoiceOutput(): Promise<void> {
  if (canUseWebSpeech()) {
    window.speechSynthesis.cancel();
  } else {
    try {
      const Speech = await import('expo-speech');
      Speech.stop();
    } catch {
      /* expo-speech unavailable in test / web */
    }
  }
  speaking = false;
  currentUtteranceId = null;
}

export async function speakVoiceOutput(
  text: string,
  options: VoiceOutputOptions = {},
): Promise<void> {
  const cleaned = stripForSpeech(text);
  if (!cleaned) return;

  await stopVoiceOutput();
  const utteranceId = `utt-${Date.now()}`;
  currentUtteranceId = utteranceId;
  speaking = true;

  const rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
  const language = options.language ?? 'ja-JP';

  const finish = (cb?: () => void) => {
    if (currentUtteranceId !== utteranceId) return;
    speaking = false;
    currentUtteranceId = null;
    cb?.();
  };

  if (canUseWebSpeech()) {
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.onend = () => finish(options.onDone);
    utterance.onerror = () => finish(options.onStopped);
    window.speechSynthesis.speak(utterance);
    return;
  }

  try {
    const Speech = await import('expo-speech');
    Speech.speak(cleaned, {
      language,
      rate,
      onDone: () => finish(options.onDone),
      onStopped: () => finish(options.onStopped),
    });
  } catch {
    speaking = false;
    currentUtteranceId = null;
    options.onStopped?.();
  }
}

export function resetVoiceOutputForTest(): void {
  speaking = false;
  currentUtteranceId = null;
}
