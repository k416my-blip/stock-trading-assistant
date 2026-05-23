import { cooperativeYield } from '../../services/cooperativeYield';
import { noteCooperativeYield } from './cooperativeYieldCounter';

export async function exportWithCooperativeYield<T>(
  chunks: Array<() => T | Promise<T>>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    if (i > 0 && i % 3 === 0) {
      await cooperativeYield(12);
      noteCooperativeYield();
    }
    out.push(await chunks[i]());
  }
  return out;
}
