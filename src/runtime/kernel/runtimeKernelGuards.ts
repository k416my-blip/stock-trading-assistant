import type { RuntimeGuardKernelState } from '../../types/runtimeKernel';

let activeGuards: RuntimeGuardKernelState | null = null;

export function setKernelGuardState(guards: RuntimeGuardKernelState): void {
  activeGuards = guards;
}

export function getKernelGuardState(): RuntimeGuardKernelState | null {
  return activeGuards;
}

export function resetKernelGuardsForTest(): void {
  activeGuards = null;
}
