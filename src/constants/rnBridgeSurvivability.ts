export const RN_BRIDGE_SURVIVABILITY_VERSION = '1.0.0';

export const RN_BRIDGE_BATCH_MS = 120;
export const RN_BRIDGE_BURST_WINDOW_MS = 2_000;
export const RN_BRIDGE_TRAFFIC_MAX_PER_SEC = 12;
export const RN_RERENDER_STORM_PER_MIN = 120;
export const RN_OBJECT_CHURN_WARN = 40;
export const RN_LISTENER_LEAK_WARN = 0.65;
export const RN_CLOSURE_RETENTION_WARN = 0.7;
export const RN_IMMUTABLE_CACHE_MAX = 32;
export const RN_SNAPSHOT_POOL_MAX = 48;
export const RN_EXPORT_CHUNK_BRIDGE_MS = 80;

export const RN_SURVIVABILITY_UI_JA = {
  sectionTitle: 'RN Bridge Survivability',
  safety: 'bridge/render/profile 最適化のみ — runtime policy / telemetry 意味は変更しません',
  survival: 'RN survival',
  bridgeTraffic: 'Bridge traffic',
  renderStorm: 'Render storm risk',
  listenerLeak: 'Listener leak risk',
} as const;
