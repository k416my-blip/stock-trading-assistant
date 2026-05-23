/**
 * Redmi / MIUI orchestrator guard — staged resume, no full hydration immediately after foreground.
 */
import { noteForegroundResumeSpike } from '../../services/redmiSchedulerGuard';
import { isPostResumeLightweightWindow } from '../../services/redmiSchedulerGuard';
import { requestReconnectSchedule } from '../stability/reconnectCoordinator';
import {
  WEBSOCKET_RECONNECT_BASE_MS,
  WEBSOCKET_RECONNECT_MAX_MS,
} from '../../constants/crossLayerCascade';

let resumePhase: 'idle' | 'compact' | 'stagger' | 'ready' = 'idle';
let resumeStartedAt = 0;
let staggerStep = 0;

export function resetRedmiOrchestratorGuardForTest(): void {
  resumePhase = 'idle';
  resumeStartedAt = 0;
  staggerStep = 0;
}

export function beginRedmiStagedResume(): void {
  noteForegroundResumeSpike();
  resumePhase = 'compact';
  resumeStartedAt = Date.now();
  staggerStep = 0;
}

export function isRedmiFullHydrationBlocked(): boolean {
  if (resumePhase === 'idle' || resumePhase === 'ready') return false;
  return Date.now() - resumeStartedAt < 12_000;
}

export function tickRedmiResumeStagger(onReady?: () => void): void {
  if (resumePhase === 'idle') return;
  const elapsed = Date.now() - resumeStartedAt;
  if (resumePhase === 'compact' && elapsed >= 2000) {
    resumePhase = 'stagger';
    staggerStep += 1;
    requestReconnectSchedule(
      WEBSOCKET_RECONNECT_BASE_MS + staggerStep * 400,
      WEBSOCKET_RECONNECT_MAX_MS,
      'redmi stagger resume',
      'redmi_stagger',
    );
  }
  if (resumePhase === 'stagger' && elapsed >= 8000) {
    resumePhase = 'ready';
    onReady?.();
  }
}

export function shouldRedmiCompactFirstRecovery(): boolean {
  return isPostResumeLightweightWindow() || resumePhase === 'compact' || resumePhase === 'stagger';
}

export function shouldRedmiAggressiveRenderSuppression(): boolean {
  return resumePhase !== 'idle' && resumePhase !== 'ready';
}

export function getRedmiResumePhase(): typeof resumePhase {
  return resumePhase;
}
