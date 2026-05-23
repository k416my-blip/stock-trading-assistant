export const RUNTIME_OBSERVABILITY_VERSION = '1.0.0';

export const JOURNAL_RING_CAPACITY = 5000;
export const JOURNAL_MEMORY_CAP_BYTES = 512_000;
export const JOURNAL_COMPACT_DETAIL_MAX = 120;

export const SNAPSHOT_RING_CAPACITY = 64;

/** Forbidden observability payloads — no user content / prompts / stealth. */
export const FORBIDDEN_OBSERVABILITY_TAGS = [
  'user_prompt',
  'raw_prompt',
  'hidden_reasoning',
  'strategy',
  'stealth_telemetry',
  'surveillance',
  'pii',
] as const;

export const STARVATION_QUEUE_DEPTH_WARNING = 12;
export const STARVATION_QUEUE_DEPTH_CRITICAL = 24;
export const STARVATION_LAG_WARNING_MS = 180;
export const STARVATION_LAG_CRITICAL_MS = 400;

export const EVENT_LOOP_SATURATED_MS = 250;

export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';
