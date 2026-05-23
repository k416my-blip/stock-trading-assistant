import { RN_EXPORT_CHUNK_BRIDGE_MS } from '../../constants/rnBridgeSurvivability';
import { scheduleBatchedBridgeJob } from './batchedBridgeScheduler';

export async function bridgeSafeExportChunks<T>(
  chunks: Array<() => T | Promise<T>>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const value = await new Promise<T>((resolve, reject) => {
      scheduleBatchedBridgeJob(() => {
        Promise.resolve(chunks[i]())
          .then(resolve)
          .catch(reject);
      });
    });
    out.push(value);
    if (i > 0 && i % 2 === 0) {
      await new Promise((r) => setTimeout(r, RN_EXPORT_CHUNK_BRIDGE_MS));
    }
  }
  return out;
}
