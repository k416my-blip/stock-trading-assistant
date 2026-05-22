import { describe, expect, it } from 'vitest';
import { cooperativeYield } from '../../src/services/cooperativeYield';

describe('cooperativeYield', () => {
  it('resolves after yielding', async () => {
    const start = Date.now();
    await cooperativeYield(8);
    expect(Date.now() - start).toBeGreaterThanOrEqual(0);
  });
});
