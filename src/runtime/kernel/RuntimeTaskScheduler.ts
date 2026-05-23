/**
 * Unified async execution — coordinator + priority scheduler under one policy applier.
 */
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import {
  getAsyncConcurrentLimit,
  getCoordinatorQueueDepth,
  getLastAsyncRuntimeEvaluation,
  runCoordinatedTask,
  setAsyncConcurrentLimit,
  evaluateAsyncRuntime,
  buildAsyncMetricsProbe,
} from '../../services/asyncRuntimeCoordinator';
import {
  applyAsyncSchedulerPolicy,
  enqueuePriorityTask,
  getPrioritySchedulerDepth,
  type AsyncPriority,
} from '../orchestrator/asyncPriorityScheduler';

export function applyRuntimeTaskPolicy(policy: RuntimeOrchestratorPolicy): void {
  applyAsyncSchedulerPolicy(policy);
}

export function getUnifiedQueueDepth(): number {
  return getCoordinatorQueueDepth() + getPrioritySchedulerDepth();
}

export {
  runCoordinatedTask,
  setAsyncConcurrentLimit,
  getAsyncConcurrentLimit,
  getCoordinatorQueueDepth,
  getLastAsyncRuntimeEvaluation,
  evaluateAsyncRuntime,
  buildAsyncMetricsProbe,
  enqueuePriorityTask,
  type AsyncPriority,
};
