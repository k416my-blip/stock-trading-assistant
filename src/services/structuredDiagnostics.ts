import { redactSecretsInString } from '../utils/secretMask';

export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'critical';

export type DiagnosticEvent = {
  id: string;
  type: string;
  severity: DiagnosticSeverity;
  module: string;
  message: string;
  timestamp: string;
  recoveryAction?: string;
  metadata?: Record<string, unknown>;
};

export type DiagnosticsReport = {
  generatedAt: string;
  eventCount: number;
  bySeverity: Record<DiagnosticSeverity, number>;
  events: DiagnosticEvent[];
  summary: string;
};

const MAX_EVENTS = 500;
const events: DiagnosticEvent[] = [];
let seq = 0;

function redactMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === 'string') out[k] = redactSecretsInString(v);
    else if (v && typeof v === 'object') out[k] = '[redacted:object]';
    else out[k] = v;
  }
  return out;
}

export function recordDiagnosticEvent(
  event: Omit<DiagnosticEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
): DiagnosticEvent {
  const row: DiagnosticEvent = {
    id: event.id ?? `diag_${++seq}`,
    type: event.type,
    severity: event.severity,
    module: event.module,
    message: redactSecretsInString(event.message),
    timestamp: event.timestamp ?? new Date().toISOString(),
    recoveryAction: event.recoveryAction,
    metadata: redactMetadata(event.metadata),
  };
  events.unshift(row);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return row;
}

export function getDiagnosticEvents(limit = 100): DiagnosticEvent[] {
  return events.slice(0, limit);
}

export function clearDiagnosticEvents(): void {
  events.length = 0;
  seq = 0;
}

export function countDiagnosticsBySeverity(): Record<DiagnosticSeverity, number> {
  const counts: Record<DiagnosticSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };
  for (const e of events) counts[e.severity] += 1;
  return counts;
}

export function exportDiagnosticsReport(limit = 200): DiagnosticsReport {
  const slice = events.slice(0, limit);
  const bySeverity = countDiagnosticsBySeverity();
  const critical = bySeverity.critical;
  const errors = bySeverity.error;
  const warnings = bySeverity.warning;
  const summary =
    critical > 0
      ? `重大 ${critical} 件 · エラー ${errors} 件 · 警告 ${warnings} 件`
      : errors > 0
        ? `エラー ${errors} 件 · 警告 ${warnings} 件`
        : warnings > 0
          ? `警告 ${warnings} 件`
          : '問題は検出されていません';

  return {
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    bySeverity,
    events: slice.map((e) => ({
      ...e,
      message: redactSecretsInString(e.message),
      metadata: redactMetadata(e.metadata),
    })),
    summary,
  };
}

export function hasDegradedDiagnostics(): boolean {
  return events.some((e) => e.severity === 'warning' || e.severity === 'error' || e.severity === 'critical');
}

/** JSON 文字列（共有・エクスポート用） */
export function exportDiagnosticsReportJson(pretty = true): string {
  const report = exportDiagnosticsReport();
  return JSON.stringify(report, null, pretty ? 2 : 0);
}
