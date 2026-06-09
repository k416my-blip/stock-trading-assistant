/**
 * AIコンシェルジュ応答の区間計測 — Metro: [CONCIERGE_PERF]
 */
export type ConciergePerfPhase =
  | 'request_start'
  | 'api_key_load'
  | 'market_data_ready'
  | 'context_built'
  | 'openai_send'
  | 'openai_response'
  | 'ui_display_complete';

export type ConciergePerfMark = {
  phase: ConciergePerfPhase;
  elapsedMs: number;
  deltaMs: number;
};

let activeTraceId: string | null = null;
let activeMessagePreview = '';
let activeStartedAt = 0;
let lastMarkAt = 0;
const marks: ConciergePerfMark[] = [];

function logLine(payload: Record<string, unknown>): void {
  console.warn('[CONCIERGE_PERF]', JSON.stringify(payload));
}

export function startConciergeChatPerf(userMessage: string): string {
  const traceId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  activeTraceId = traceId;
  activeMessagePreview = userMessage.trim().slice(0, 80);
  activeStartedAt = Date.now();
  lastMarkAt = activeStartedAt;
  marks.length = 0;
  logLine({
    traceId,
    phase: 'request_start',
    messagePreview: activeMessagePreview,
    elapsedMs: 0,
    deltaMs: 0,
  });
  return traceId;
}

export function markConciergeChatPerf(phase: ConciergePerfPhase): void {
  if (!activeTraceId) return;
  const now = Date.now();
  const elapsedMs = now - activeStartedAt;
  const deltaMs = now - lastMarkAt;
  lastMarkAt = now;
  marks.push({ phase, elapsedMs, deltaMs });
  logLine({
    traceId: activeTraceId,
    phase,
    elapsedMs,
    deltaMs,
    messagePreview: activeMessagePreview,
  });
}

export function finishConciergeChatPerf(extra?: Record<string, unknown>): void {
  if (!activeTraceId) return;
  const totalMs = Date.now() - activeStartedAt;
  const breakdown = Object.fromEntries(marks.map((m) => [m.phase, m.elapsedMs]));
  logLine({
    traceId: activeTraceId,
    phase: 'summary',
    totalMs,
    breakdown,
    messagePreview: activeMessagePreview,
    ...extra,
  });
  activeTraceId = null;
  activeMessagePreview = '';
  marks.length = 0;
}

export function resetConciergeChatPerfForTest(): void {
  activeTraceId = null;
  activeMessagePreview = '';
  marks.length = 0;
}
