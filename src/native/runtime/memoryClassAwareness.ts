import type { NativeMemoryClassSnapshot } from '../../types/nativeRuntimeBridge';
import { getLastNativeRuntimeSnapshot } from './nativeRuntimeBridge';

export type MemoryClassPolicyHints = {
  compactFirst: boolean;
  preloadForbidden: boolean;
  speculativeRenderForbidden: boolean;
};

export function resolveMemoryClassPolicy(
  memoryClass?: NativeMemoryClassSnapshot | null,
): MemoryClassPolicyHints {
  const mc = memoryClass ?? getLastNativeRuntimeSnapshot()?.memoryClass;
  const lowRam = mc?.lowRamDevice ?? mc?.isLowRamDevice ?? false;
  const smallClass = (mc?.memoryClassMb ?? 256) < 128;
  return {
    compactFirst: lowRam || smallClass,
    preloadForbidden: lowRam,
    speculativeRenderForbidden: lowRam || smallClass,
  };
}
