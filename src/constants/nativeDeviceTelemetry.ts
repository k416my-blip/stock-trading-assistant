export const NATIVE_DEVICE_TELEMETRY_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G_TELEMETRY = 'Redmi Note 13 Pro 5G';

/** Foreground sampling (ms). */
export const NATIVE_TELEMETRY_SAMPLE_FG_MS = 2_000;
/** Background minimal telemetry (ms). */
export const NATIVE_TELEMETRY_SAMPLE_BG_MS = 15_000;
/** Dashboard UI refresh cap (ms). */
export const NATIVE_TELEMETRY_DASHBOARD_MS = 5_000;
/** Thermal severe — profilers paused, lifecycle-only. */
export const NATIVE_TELEMETRY_THERMAL_PAUSE_STATUSES = ['severe', 'critical', 'emergency', 'shutdown'] as const;

export const NATIVE_TELEMETRY_MEMORY_SNAPSHOT_MAX = 120;
export const NATIVE_TELEMETRY_TICK_HISTOGRAM_MAX = 64;
export const NATIVE_TELEMETRY_HEAP_LEAK_SAMPLES = 48;
export const NATIVE_TELEMETRY_ASYNC_SATURATION_DEPTH = 64;
export const NATIVE_TELEMETRY_RENDER_STORM_BURST = 12;
export const NATIVE_TELEMETRY_JS_STALL_WARN_MS = 200;
export const NATIVE_TELEMETRY_GC_HEAP_DROP_MB = 3;

export const NATIVE_TELEMETRY_UI_LABELS_JA = {
  sectionTitle: 'Native Telemetry',
  safety: '観測のみ — runtime 挙動・戦略・ガバナンスは変更しません',
  samplingMode: 'Sampling',
  jsHeap: 'JS heap (est)',
  nativeHeap: 'Native heap',
  gcPerSec: 'GC/sec (est)',
  jsStall: 'JS stall',
  droppedFrames: 'Dropped frames',
  tickAvg: 'Tick avg',
  tickMax: 'Tick max',
  replayGrowth: 'Replay growth/min',
  renderPerSec: 'Render/sec',
  wsReconnect: 'WS reconnect',
  asyncDepth: 'Async depth',
  batteryDelta: 'Battery Δ/h',
  thermalDuration: 'Thermal severe(s)',
  bridgePressure: 'Bridge pressure',
} as const;
