/**
 * Orchestrator integration — delegates to Runtime Kernel (single policy owner).
 */
import type { RuntimeKernelInput } from '../../types/runtimeKernel';

export type OrchestratorIntegrationInput = RuntimeKernelInput;

export {
  evaluateAndApplyRuntimeKernel as evaluateAndApplyRuntimeOrchestrator,
  getLastRuntimeOrchestratorSnapshot,
  shouldOrchestratorPauseConciergeAi,
  shouldOrchestratorThrottleProactive,
  shouldOrchestratorBlockBackgroundRefresh,
  getRuntimeHealthSummaryJa,
} from '../kernel/runtimeKernelIntegration';
