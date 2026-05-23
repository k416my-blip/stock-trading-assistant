import { TELEMETRY_EXPORT_CHUNK_BYTES } from '../../../constants/telemetryOverhead';

export type ExportChunk = { index: number; total: number; bytes: number; payload: string };

export function streamExportChunks(json: string, chunkBytes = TELEMETRY_EXPORT_CHUNK_BYTES): ExportChunk[] {
  const chunks: ExportChunk[] = [];
  let index = 0;
  for (let offset = 0; offset < json.length; offset += chunkBytes) {
    const payload = json.slice(offset, offset + chunkBytes);
    chunks.push({ index, total: 0, bytes: payload.length, payload });
    index += 1;
  }
  const total = chunks.length;
  return chunks.map((c) => ({ ...c, total }));
}
