import { useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';
import {
  noteDeferredActivationCancelled,
  noteDeferredActivationCompleted,
  noteDeferredActivationDuplicatePrevented,
  noteDeferredActivationScheduled,
  noteWatchdogTimerCleared,
  noteWatchdogTimerScheduled,
} from '../services/mobileStabilityWatchdog';
import {
  noteHydrationCollision,
  noteHydrationSuppressed,
  noteStaleAsyncRejected,
} from '../services/runtimeChaosResilience';
import { noteHydrationTiming } from '../services/runtimeFrameTelemetry';
import {
  decideAdaptiveHydration,
  noteAdaptiveDeferredCancellation,
  type RuntimeHydrationPriority,
} from '../services/adaptiveRuntimeGovernor';
import {
  decideMemoryHydrationCleanup,
  noteInactiveHydrationRetention,
  noteMemoryCleanupActivity,
  noteMemoryDeferredCancelled,
  noteMemoryDeferredCompleted,
  noteMemoryDeferredQueued,
  noteStaleClosureRetentionEstimate,
} from '../services/runtimeMemoryPressureDefense';
import {
  noteLongSessionDeferredActivationReplay,
  noteLongSessionHydrationQueued,
  noteLongSessionHydrationReplay,
  noteLongSessionRecoveryValidation,
} from '../services/longSessionRuntimeSoak';
import {
  decideSelfHealingRuntimeActivity,
  noteSelfHealingRecoveryStage,
} from '../services/runtimeSelfHealingSystem';
import { decideDeviceAdaptiveHydration } from '../services/runtimeDeviceAdaptiveOptimization';

export type DeferredRenderActivationOptions = {
  delayMs?: number;
  initiallyActive?: boolean;
  label?: string;
  pauseWhenInactive?: boolean;
  priority?: RuntimeHydrationPriority;
};

export function useDeferredRenderActivation(
  options: DeferredRenderActivationOptions = {},
): boolean {
  const {
    delayMs = 0,
    initiallyActive = false,
    label = 'deferred-render',
    pauseWhenInactive = true,
    priority = 'normal',
  } = options;
  const [active, setActive] = useState(initiallyActive);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (active) {
      noteDeferredActivationDuplicatePrevented(label);
      noteHydrationCollision(label, 'already active');
      noteStaleClosureRetentionEstimate(label, 'already active deferred closure');
      return undefined;
    }
    if (scheduledRef.current) {
      noteDeferredActivationDuplicatePrevented(label);
      noteHydrationCollision(label, 'already scheduled');
      noteStaleClosureRetentionEstimate(label, 'duplicate scheduled deferred closure');
      return undefined;
    }
    scheduledRef.current = true;
    noteDeferredActivationScheduled(label);
    noteMemoryDeferredQueued(label, priority);
    noteLongSessionHydrationQueued(label, 1);

    let cancelled = false;
    let completed = false;
    const startedAt = Date.now();
    let timerId: string | null = null;
    let cleanupTimer: (() => void) | undefined;
    const activate = () => {
      if (!cancelled) {
        const deviceDecision = decideDeviceAdaptiveHydration(label, priority, AppState.currentState);
        if (!deviceDecision.allow) {
          noteHydrationSuppressed(label, deviceDecision.reason);
          noteMemoryDeferredCancelled(label, deviceDecision.reason);
          noteMemoryCleanupActivity(label, deviceDecision.reason);
          noteAdaptiveDeferredCancellation(label, deviceDecision.reason);
          noteLongSessionDeferredActivationReplay(label, deviceDecision.reason);
          timerId = noteWatchdogTimerScheduled(`device-adaptive-deferred:${label}`);
          const retry = setTimeout(() => {
            noteWatchdogTimerCleared(timerId ?? '', `device-adaptive-deferred:${label}`);
            timerId = null;
            noteMemoryDeferredQueued(label, priority);
            activate();
          }, Math.max(1_000, deviceDecision.delayMs));
          cleanupTimer = () => clearTimeout(retry);
          return;
        }
        const healingDecision = decideSelfHealingRuntimeActivity(label, priority);
        if (!healingDecision.allow) {
          noteHydrationSuppressed(label, healingDecision.reason);
          noteMemoryDeferredCancelled(label, healingDecision.reason);
          noteMemoryCleanupActivity(label, healingDecision.reason);
          noteAdaptiveDeferredCancellation(label, healingDecision.reason);
          noteLongSessionDeferredActivationReplay(label, healingDecision.reason);
          timerId = noteWatchdogTimerScheduled(`self-healing-deferred:${label}`);
          const retry = setTimeout(() => {
            noteWatchdogTimerCleared(timerId ?? '', `self-healing-deferred:${label}`);
            timerId = null;
            noteSelfHealingRecoveryStage(label, 'gradual hydration replay');
            noteMemoryDeferredQueued(label, priority);
            activate();
          }, Math.max(1_000, healingDecision.delayMs));
          cleanupTimer = () => clearTimeout(retry);
          return;
        }
        const memoryDecision = decideMemoryHydrationCleanup(label, priority, AppState.currentState);
        if (!memoryDecision.allow) {
          noteHydrationSuppressed(label, memoryDecision.reason);
          noteMemoryDeferredCancelled(label, memoryDecision.reason);
          noteMemoryCleanupActivity(label, memoryDecision.reason);
          noteAdaptiveDeferredCancellation(label, memoryDecision.reason);
          noteLongSessionDeferredActivationReplay(label, memoryDecision.reason);
          timerId = noteWatchdogTimerScheduled(`memory-deferred:${label}`);
          const retry = setTimeout(() => {
            noteWatchdogTimerCleared(timerId ?? '', `memory-deferred:${label}`);
            timerId = null;
            noteMemoryDeferredQueued(label, priority);
            activate();
          }, Math.max(1_000, memoryDecision.delayMs));
          cleanupTimer = () => clearTimeout(retry);
          return;
        }
        const decision = decideAdaptiveHydration(label, priority, delayMs);
        if (!decision.allow) {
          noteHydrationSuppressed(label, decision.reason);
          noteAdaptiveDeferredCancellation(label, decision.reason);
          noteMemoryCleanupActivity(label, decision.reason);
          noteLongSessionDeferredActivationReplay(label, decision.reason);
          timerId = noteWatchdogTimerScheduled(`governor-deferred:${label}`);
          const retry = setTimeout(() => {
            noteWatchdogTimerCleared(timerId ?? '', `governor-deferred:${label}`);
            timerId = null;
            noteMemoryDeferredQueued(label, priority);
            activate();
          }, Math.max(1_000, decision.delayMs));
          cleanupTimer = () => clearTimeout(retry);
          return;
        }
        if (pauseWhenInactive && AppState.currentState !== 'active') {
          noteHydrationSuppressed(label, `inactive:${AppState.currentState}`);
          noteInactiveHydrationRetention(label, AppState.currentState);
          noteMemoryCleanupActivity(label, `inactive:${AppState.currentState}`);
          noteLongSessionRecoveryValidation(label, 'background', `inactive:${AppState.currentState}`);
          timerId = noteWatchdogTimerScheduled(`inactive-deferred:${label}`);
          const retry = setTimeout(() => {
            noteWatchdogTimerCleared(timerId ?? '', `inactive-deferred:${label}`);
            timerId = null;
            noteMemoryDeferredQueued(label, priority);
            activate();
          }, Math.max(1_000, delayMs));
          cleanupTimer = () => clearTimeout(retry);
          return;
        }
        completed = true;
        if (timerId) {
          noteWatchdogTimerCleared(timerId, `deferred:${label}`);
          timerId = null;
        }
        const elapsed = Date.now() - startedAt;
        noteDeferredActivationCompleted(label, elapsed);
        noteHydrationTiming(label, elapsed);
        noteMemoryDeferredCompleted(label);
        noteLongSessionHydrationReplay(label, elapsed);
        setActive(true);
      }
    };
    const interaction = InteractionManager.runAfterInteractions(() => {
      const deviceDecision = decideDeviceAdaptiveHydration(label, priority, AppState.currentState);
      if (deviceDecision.delayMs > delayMs) {
        timerId = noteWatchdogTimerScheduled(`device-adaptive-deferred:${label}`);
        const timer = setTimeout(activate, deviceDecision.delayMs);
        cleanupTimer = () => {
          clearTimeout(timer);
          if (timerId) noteWatchdogTimerCleared(timerId, `device-adaptive-deferred:${label}`);
        };
        return;
      }
      const healingDecision = decideSelfHealingRuntimeActivity(label, priority);
      if (healingDecision.delayMs > delayMs) {
        timerId = noteWatchdogTimerScheduled(`self-healing-deferred:${label}`);
        const timer = setTimeout(activate, healingDecision.delayMs);
        cleanupTimer = () => {
          clearTimeout(timer);
          if (timerId) noteWatchdogTimerCleared(timerId, `self-healing-deferred:${label}`);
        };
        return;
      }
      const decision = decideAdaptiveHydration(label, priority, delayMs);
      if (decision.delayMs <= 0) {
        activate();
        return;
      }
      timerId = noteWatchdogTimerScheduled(`deferred:${label}`);
      const timer = setTimeout(activate, decision.delayMs);
      cleanupTimer = () => {
        clearTimeout(timer);
        if (timerId) noteWatchdogTimerCleared(timerId, `deferred:${label}`);
      };
    });

    return () => {
      cancelled = true;
      scheduledRef.current = false;
      cleanupTimer?.();
      interaction.cancel?.();
      if (!completed) noteDeferredActivationCancelled(label);
      if (!completed) {
        noteStaleAsyncRejected(label, 'deferred activation cancelled');
        noteAdaptiveDeferredCancellation(label, 'deferred activation cancelled');
        noteMemoryDeferredCancelled(label, 'deferred activation cancelled');
        noteMemoryCleanupActivity(label, 'deferred activation cancelled');
        noteLongSessionDeferredActivationReplay(label, 'deferred activation cancelled');
      }
    };
  }, [active, delayMs, label, pauseWhenInactive, priority]);

  return active;
}
