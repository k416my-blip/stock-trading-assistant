/**
 * Safe observability — runtime/system metrics only; no sensitive persistence.
 */
import { FORBIDDEN_OBSERVABILITY_TAGS, JOURNAL_COMPACT_DETAIL_MAX } from '../../constants/runtimeObservability';

function normalizedObservabilityBlob(detailJa: string, tag?: string): string {
  return `${detailJa} ${tag ?? ''}`.toLowerCase().replace(/[\s_-]/g, '');
}

export function sanitizeObservabilityDetail(detailJa: string, tag?: string): string {
  const blob = normalizedObservabilityBlob(detailJa, tag);
  for (const forbidden of FORBIDDEN_OBSERVABILITY_TAGS) {
    const token = forbidden.replace(/_/g, '');
    if (blob.includes(token)) {
      return '[redacted-system-event]';
    }
  }
  if (detailJa.length > JOURNAL_COMPACT_DETAIL_MAX) {
    return `${detailJa.slice(0, JOURNAL_COMPACT_DETAIL_MAX)}…`;
  }
  return detailJa;
}

export function isObservabilityPayloadAllowed(detailJa: string, tag?: string): boolean {
  return sanitizeObservabilityDetail(detailJa, tag) !== '[redacted-system-event]';
}
