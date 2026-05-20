import { Platform } from 'react-native';
import {
  getVoiceInputAvailabilityForPlatform,
  resetVoiceInputCoreForTest,
  startVoiceCaptureCore,
  stopVoiceCaptureCore,
  type VoiceInputStatus,
} from './aiVoiceInputCore';

export type { VoiceInputStatus };

export function getVoiceInputAvailability(): VoiceInputStatus {
  return getVoiceInputAvailabilityForPlatform(Platform.OS);
}

export function stopVoiceCapture(): void {
  stopVoiceCaptureCore();
}

export function startVoiceCapture(
  onTranscript: (text: string) => void,
  onStatus: (status: VoiceInputStatus, messageJa?: string) => void,
): void {
  startVoiceCaptureCore(Platform.OS, onTranscript, onStatus);
}

export function resetVoiceInputForTest(): void {
  resetVoiceInputCoreForTest();
}
