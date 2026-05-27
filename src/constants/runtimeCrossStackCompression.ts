export const RUNTIME_CROSS_STACK_COMPRESSION_VERSION = '1.0.0';
export const RUNTIME_CROSS_STACK_COMPRESSION_POLL_MS = 36_000;
export const RUNTIME_CROSS_STACK_COMPRESSION_TIMELINE_MAX = 400;
export const ESTIMATED_RUNTIME_STACK_COUNT = 16;

export const RUNTIME_CROSS_STACK_COMPRESSION_UI_JA = {
  sectionTitle: 'Cross-Stack Compression',
  safety: 'cross-stack compression — observe-only。stack 意味・recommendation は変更しません',
  signalCompressionRatio: 'signalCompressionRatio',
  telemetryDedupRatio: 'telemetryDedupRatio',
  observerDedupRatio: 'observerDedupRatio',
  replayDedupRatio: 'replayDedupRatio',
  crossStackCompressionScore: 'crossStackCompressionScore',
  timeline: 'compression timeline',
} as const;

export const STACK_TOPOLOGY_LAYERS = [
  'js_thread',
  'bridge',
  'recovery',
  'governance',
  'amplification',
  'audit',
  'compression',
  'homeostasis',
  'civilization',
  'epistemic',
  'agency',
  'meta',
  'narrative',
  'observer_recursion',
  'resource',
  'cross_stack',
] as const;
