import type { SoakMetricGraphs } from '../../types/automatedSoakRunner';
import { getRuntimeSnapshots } from './runtimeSnapshotRecorder';
import { buildDecimatedGraph } from '../telemetry/overhead';

export function buildSoakMetricGraphs(): SoakMetricGraphs {
  const snaps = getRuntimeSnapshots();
  return {
    memoryDriftSparkline: buildDecimatedGraph(snaps.map((s) => s.jsHeapMb)).sparkline,
    replayGrowthSparkline: buildDecimatedGraph(snaps.map((s) => s.replayCount)).sparkline,
    thermalSparkline: buildDecimatedGraph(
      snaps.map((s) =>
        s.thermalStatus === 'none'
          ? 0
          : s.thermalStatus === 'light'
            ? 1
            : s.thermalStatus === 'moderate'
              ? 2
              : s.thermalStatus === 'severe'
                ? 3
                : 4,
      ),
    ).sparkline,
    wsReconnectSparkline: buildDecimatedGraph(snaps.map((s) => s.wsReconnects)).sparkline,
  };
}
