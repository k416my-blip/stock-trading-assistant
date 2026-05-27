import type { RuntimeCrossStackCompressionExportBundle } from '../types/runtimeCrossStackCompression';
import { RUNTIME_CROSS_STACK_COMPRESSION_VERSION } from '../constants/runtimeCrossStackCompression';
import { getLastRuntimeCrossStackCompressionProfile } from './crossStackCompressionCoordinator';

export function buildRuntimeCrossStackCompressionExportBundle(): RuntimeCrossStackCompressionExportBundle {
  const profile = getLastRuntimeCrossStackCompressionProfile();
  return {
    version: RUNTIME_CROSS_STACK_COMPRESSION_VERSION,
    exportedAt: new Date().toISOString(),
    compressionReport: { profile },
    topologyExport: {},
    deduplicationReport: {},
    heatmapExport: {},
    profile,
  };
}

export function formatRuntimeCrossStackCompressionExportJson(): string {
  return JSON.stringify(buildRuntimeCrossStackCompressionExportBundle(), null, 2);
}
