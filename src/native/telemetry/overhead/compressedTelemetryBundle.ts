import type { CompressedTelemetryBundle } from '../../../types/telemetryOverhead';
import { compactionRatio } from './snapshotCompaction';

function encodeBase64Utf8(input: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(input)));
  }
  const Buf = (globalThis as { Buffer?: { from(s: string, enc: string): { toString(e: string): string } } }).Buffer;
  if (Buf) return Buf.from(input, 'utf8').toString('base64');
  return input;
}

export function buildCompressedTelemetryBundle(
  payload: unknown,
  compactedCount: number,
  rawCount: number,
): CompressedTelemetryBundle {
  const json = JSON.stringify(payload);
  return {
    format: 'sta-telemetry-compact-v1',
    compressionRatio: compactionRatio(rawCount, compactedCount || 1),
    payloadBase64: encodeBase64Utf8(json),
    originalBytes: json.length,
  };
}
