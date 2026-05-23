/**
 * Controlled Mutation Sandbox — mutations only on isolated clone.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { SandboxGraphClone } from '../../types/runtimeCuriosity';
import { FORBIDDEN_CURIOSITY_MUTATIONS } from '../../constants/runtimeCuriosity';
import {
  appendSandboxMutation,
  createSandboxClone,
  getActiveSandbox,
} from './curiosityStorage';

export function auditMutationAllowed(detailJa: string): boolean {
  const blob = detailJa.toLowerCase().replace(/[\s_-]/g, '');
  return !FORBIDDEN_CURIOSITY_MUTATIONS.some((f) => blob.includes(f.replace(/_/g, '')));
}

export function runSandboxMutation(
  store: AdaptiveRuntimeLearningState,
  kind: Parameters<typeof appendSandboxMutation>[1],
  detailJa: string,
  seed: number,
): { sandbox: SandboxGraphClone; applied: boolean; blocked: boolean; success: boolean } {
  if (!auditMutationAllowed(detailJa)) {
    return {
      sandbox: getActiveSandbox() ?? createSandboxClone(store.edges),
      applied: false,
      blocked: true,
      success: false,
    };
  }

  let sandbox = getActiveSandbox();
  if (!sandbox) sandbox = createSandboxClone(store.edges);

  const edgeKeys = Object.keys(sandbox.edges);
  const key = edgeKeys[seed % Math.max(1, edgeKeys.length)];
  if (key && sandbox.edges[key]) {
    const delta = (seed % 10) / 100 - 0.05;
    sandbox.edges[key].weight = Math.max(0.05, Math.min(0.95, sandbox.edges[key].weight + delta));
  }

  const success = seed % 5 !== 0;
  appendSandboxMutation(sandbox, kind, detailJa, seed, success);
  return { sandbox, applied: true, blocked: false, success };
}
