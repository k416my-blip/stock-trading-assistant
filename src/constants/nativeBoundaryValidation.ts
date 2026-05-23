export const NATIVE_BOUNDARY_TRACE_MAX = 64;
export const WEBSOCKET_OWNERSHIP_TRACE_MAX = 32;

export const RECONNECT_LATENCY_BUCKETS_MS = [0, 250, 500, 1000, 2500, 5000, 10_000] as const;
export const EVENT_LOOP_LAG_BUCKETS_MS = [0, 50, 100, 150, 250, 500, 1000] as const;
export const MEMORY_PRESSURE_BUCKETS_PCT = [0, 25, 40, 55, 70, 85, 100] as const;
export const BRIDGE_FETCH_BUCKETS_MS = [0, 50, 100, 250, 500, 1000] as const;

export const THERMAL_BUCKET_LABELS = [
  'none',
  'light',
  'moderate',
  'severe',
  'critical+',
] as const;

export const NATIVE_BOUNDARY_SOAK_REPORT_VERSION = '1.0.0';
