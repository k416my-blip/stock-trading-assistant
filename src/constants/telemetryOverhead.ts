export const TELEMETRY_OVERHEAD_VERSION = '1.0.0';

export const TELEMETRY_RING_BUFFER_MAX = 120;
export const TELEMETRY_TIMELINE_MAX = 200;
export const TELEMETRY_COALESCE_WINDOW_MS = 3_000;
export const TELEMETRY_DRIFT_WINDOW_MS = 60_000;
export const TELEMETRY_ASYNC_STORAGE_BURST_MAX = 4;
export const TELEMETRY_ASYNC_STORAGE_BURST_WINDOW_MS = 60_000;
export const TELEMETRY_DASHBOARD_ROW_BUDGET = 24;
export const TELEMETRY_GRAPH_DECIMATE_TARGET = 14;
export const TELEMETRY_EXPORT_CHUNK_BYTES = 48_000;
export const TELEMETRY_REPLAY_ARCHIVE_MAX = 64;

export const TELEMETRY_OVERHEAD_UI_JA = {
  sectionTitle: 'Telemetry Overhead',
  safety: '監視最適化のみ — runtime 意思決定は変更しません',
  mode: 'Mode',
  cpuCost: 'Telemetry CPU (est)',
  memoryCost: 'Telemetry memory (est)',
  dashboardCost: 'Dashboard render (est)',
  writeRate: 'Snapshot write/s',
  storagePressure: 'AsyncStorage pressure',
  compression: 'Compression ratio',
} as const;
