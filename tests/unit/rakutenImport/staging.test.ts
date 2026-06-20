import { beforeEach, describe, expect, it } from 'vitest';
import {
  findImportCandidate,
  loadRakutenImportStaging,
  pruneConfirmedBatches,
  resetRakutenImportStagingMemoryForTest,
  saveImportBatch,
  upsertImportCandidate,
} from '../../../src/services/rakutenImport/rakutenImportStagingStorage';
import { buildManualImportCandidate } from '../../../src/services/rakutenImport/buildManualImportCandidate';
import { createDefaultAppState } from '../../../src/services/storage';

describe('rakutenImportStagingStorage', () => {
  beforeEach(() => {
    resetRakutenImportStagingMemoryForTest();
  });

  it('saveImportBatch persists and findImportCandidate retrieves candidate', async () => {
    const state = createDefaultAppState();
    const { batch, candidate } = buildManualImportCandidate(
      {
        type: 'deposit',
        amountMYR: 1000,
        executedAt: '2026-06-20',
      },
      { state },
    );

    await saveImportBatch(batch);
    const found = await findImportCandidate(candidate.id);

    expect(found?.candidate.id).toBe(candidate.id);
    expect(found?.batch.id).toBe(batch.id);
  });

  it('upsertImportCandidate updates candidate status', async () => {
    const state = createDefaultAppState();
    const { batch, candidate } = buildManualImportCandidate(
      {
        type: 'buy',
        symbol: '5398',
        market: 'bursa',
        currency: 'MYR',
        quantity: 100,
        price: 10,
        executedAt: '2026-06-20',
      },
      { state },
    );
    await saveImportBatch(batch);

    const rejected = { ...candidate, status: 'rejected' as const, rejectedAt: '2026-06-20' };
    await upsertImportCandidate(batch.id, rejected);

    const found = await findImportCandidate(candidate.id);
    expect(found?.candidate.status).toBe('rejected');
  });

  it('pruneConfirmedBatches removes confirmed and rejected candidates', async () => {
    const state = createDefaultAppState();
    const { batch, candidate } = buildManualImportCandidate(
      {
        type: 'deposit',
        amountMYR: 500,
        executedAt: '2026-06-20',
      },
      { state },
    );
    await saveImportBatch(batch);

    const confirmed = {
      ...candidate,
      status: 'confirmed' as const,
      confirmedAt: '2026-06-20',
    };
    await upsertImportCandidate(batch.id, confirmed);
    await pruneConfirmedBatches();

    const store = await loadRakutenImportStaging();
    expect(store.batches).toHaveLength(0);
    expect(await findImportCandidate(candidate.id)).toBeNull();
  });
});
