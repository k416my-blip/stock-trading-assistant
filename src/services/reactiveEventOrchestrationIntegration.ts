import type { ReactiveEventOrchestrationBundle } from '../types/reactiveEventOrchestration';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import {
  dispatchConciergeEvent,
  registerOrchestratedRefresh,
  replayOfflineEventQueue,
  setOrchestrationRuntimeContext,
} from './reactiveEventOrchestrationRuntime';
import { markReactiveReplayComplete } from './reactiveEventOrchestrationStorage';

let initDone = false;

export function initReactiveEventOrchestration(): void {
  if (initDone) return;
  initDone = true;
}

export function attachReactiveOrchestrationToContext(
  payload: AiStrategyContextPayload,
  bundle: ReactiveEventOrchestrationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    reactiveEventOrchestration: bundle,
  };
}

export async function orchestrateResumeReplay(): Promise<number> {
  const n = await replayOfflineEventQueue();
  if (n > 0) await markReactiveReplayComplete();
  return n;
}

export {
  dispatchConciergeEvent,
  registerOrchestratedRefresh,
  setOrchestrationRuntimeContext,
};

export function resetReactiveOrchestrationIntegrationForTest(): void {
  initDone = false;
}
