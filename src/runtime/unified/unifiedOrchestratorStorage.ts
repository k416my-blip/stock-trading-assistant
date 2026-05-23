/**
 * Unified orchestrator storage — tick seq, locks, last bundle.
 */
import { UNIFIED_TICK_MIN_INTERVAL_MS } from '../../constants/runtimeUnifiedOrchestrator';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import type {
  UnifiedOrchestratorState,
  UnifiedRuntimeOrchestratorBundle,
  UnifiedRuntimeTickPhase,
} from '../../types/runtimeUnifiedOrchestrator';

let tickSeq = 0;
let lastTickAtMs = 0;
let orchestratorState: UnifiedOrchestratorState = 'HEALTHY';
let governanceLockedUntil = 0;
let recoveryStreak = 0;
let emergencyBrake = false;
let safeMode = false;
let layersTickDepth = 0;
let lastBundle: UnifiedRuntimeOrchestratorBundle | null = null;
let lastStabilitySnapshot: RuntimeStabilitySnapshot | null = null;
let lastPhases: UnifiedRuntimeTickPhase[] = [];
let zombieTickCount = 0;

export function resetUnifiedOrchestratorStorageForTest(): void {
  tickSeq = 0;
  lastTickAtMs = 0;
  orchestratorState = 'HEALTHY';
  governanceLockedUntil = 0;
  recoveryStreak = 0;
  emergencyBrake = false;
  safeMode = false;
  layersTickDepth = 0;
  lastBundle = null;
  lastStabilitySnapshot = null;
  lastPhases = [];
  zombieTickCount = 0;
}

export function beginLayersTick(): boolean {
  if (layersTickDepth > 0) return false;
  layersTickDepth += 1;
  return true;
}

export function endLayersTick(): void {
  layersTickDepth = Math.max(0, layersTickDepth - 1);
}

export function isLayersTickReentrant(): boolean {
  return layersTickDepth > 0;
}

export function noteUnifiedTickComplete(nowMs = Date.now()): { tickSeq: number; driftMs: number } {
  const driftMs = lastTickAtMs > 0 ? nowMs - lastTickAtMs - UNIFIED_TICK_MIN_INTERVAL_MS : 0;
  tickSeq += 1;
  lastTickAtMs = nowMs;
  return { tickSeq, driftMs };
}

export function getLastUnifiedTickAtMs(): number {
  return lastTickAtMs;
}

export function getOrchestratorState(): UnifiedOrchestratorState {
  return orchestratorState;
}

export function setOrchestratorState(state: UnifiedOrchestratorState): void {
  orchestratorState = state;
}

export function isGovernanceLocked(nowMs = Date.now()): boolean {
  return nowMs < governanceLockedUntil;
}

export function lockGovernance(nowMs = Date.now(), durationMs = 800): void {
  governanceLockedUntil = nowMs + durationMs;
}

export function noteRecoveryAttempt(success: boolean): void {
  if (success) recoveryStreak = 0;
  else recoveryStreak += 1;
}

export function getRecoveryStreak(): number {
  return recoveryStreak;
}

export function setEmergencyBrake(active: boolean): void {
  emergencyBrake = active;
}

export function isEmergencyBrakeActive(): boolean {
  return emergencyBrake;
}

export function setSafeMode(active: boolean): void {
  safeMode = active;
}

export function isSafeModeActive(): boolean {
  return safeMode;
}

export function noteZombieTick(): void {
  zombieTickCount += 1;
}

export function getZombieTickCount(): number {
  return zombieTickCount;
}

export function setLastUnifiedBundle(bundle: UnifiedRuntimeOrchestratorBundle): void {
  lastBundle = bundle;
}

export function getLastUnifiedBundle(): UnifiedRuntimeOrchestratorBundle | null {
  return lastBundle;
}

export function setLastLayersStabilitySnapshot(snap: RuntimeStabilitySnapshot): void {
  lastStabilitySnapshot = snap;
}

export function getLastLayersStabilitySnapshot(): RuntimeStabilitySnapshot | null {
  return lastStabilitySnapshot;
}

export function setLastPhasesCompleted(phases: UnifiedRuntimeTickPhase[]): void {
  lastPhases = [...phases];
}

export function getLastPhasesCompleted(): UnifiedRuntimeTickPhase[] {
  return [...lastPhases];
}

export function setLastUnifiedTickAtMsForTest(ms: number): void {
  lastTickAtMs = ms;
}
