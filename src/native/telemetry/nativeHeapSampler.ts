import type { NativeHeapSamplerSnapshot } from '../../types/nativeDeviceTelemetry';
import { getLastNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';

export function sampleNativeHeap(): NativeHeapSamplerSnapshot {
  const native = getLastNativeRuntimeSnapshot();
  if (!native) {
    return {
      nativeHeapMb: 0,
      javaHeapUsedMb: 0,
      availMemMb: 0,
      totalMemMb: 0,
      memoryPressurePct: 0,
    };
  }
  return {
    nativeHeapMb: Math.round(native.nativeHeapAllocatedMb * 10) / 10,
    javaHeapUsedMb: Math.round(native.javaHeapUsedMb * 10) / 10,
    availMemMb: Math.round(native.availMemMb),
    totalMemMb: Math.round(native.totalMemMb),
    memoryPressurePct: native.nativeMemoryPressurePct,
  };
}
