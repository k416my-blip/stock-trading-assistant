import { beforeEach, describe, expect, it } from 'vitest';
import { commitImportCandidateInState } from '../../../src/services/rakutenImport/commitImportCandidate';
import { buildNaturalLanguageImportCandidate } from '../../../src/services/rakutenImport/buildNaturalLanguageImportCandidate';
import { parseNaturalLanguageTransaction } from '../../../src/services/rakutenImport/naturalLanguageTransactionParser';
import {
  findImportCandidate,
  isActiveImportCandidate,
  reloadRakutenImportStagingFromDisk,
  resetRakutenImportStagingMemoryForTest,
  saveImportBatch,
  upsertImportCandidate,
} from '../../../src/services/rakutenImport/rakutenImportStagingStorage';
import { createDefaultAppState } from '../../../src/services/storage';

describe('AI chat deposit import hotfix', () => {
  beforeEach(() => {
    resetRakutenImportStagingMemoryForTest();
  });

  it('parses RM5000入金しました as deposit amount 5000', () => {
    const state = createDefaultAppState();
    const r = parseNaturalLanguageTransaction('RM5000入金しました', { state });
    expect('type' in r && r.type).toBe('deposit');
    if (!('type' in r)) return;
    expect(r.totalMYR).toBe(5000);
    expect(r.overallConfidence).toBeGreaterThanOrEqual(0.85);
  });

  it('stages NL candidate and confirm screen lookup succeeds with same candidateId', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    await saveImportBatch(built.batch);

    const found = await findImportCandidate(built.candidate.id, { activeOnly: true });
    expect(found?.candidate.id).toBe(built.candidate.id);
    expect(found?.batch.id).toBe(built.batch.id);
    expect(found?.candidate.type).toBe('deposit');
    expect(found?.candidate.totalMYR).toBe(5000);
    expect(found?.candidate.status).toBe('ready_to_confirm');
    expect(isActiveImportCandidate(found!.candidate)).toBe(true);
  });

  it('reloads from disk when in-memory store is stale after save', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    if (!built.ok) throw new Error('build failed');

    await saveImportBatch(built.batch);
    resetRakutenImportStagingMemoryForTest();

    const found = await findImportCandidate(built.candidate.id, {
      activeOnly: true,
      reloadIfMissing: true,
    });
    expect(found?.candidate.totalMYR).toBe(5000);
  });

  it('commits deposit to AppState.deposits with natural_language source', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    if (!built.ok) throw new Error('build failed');

    await saveImportBatch(built.batch);
    const found = await findImportCandidate(built.candidate.id, { activeOnly: true });
    expect(found).not.toBeNull();

    const result = commitImportCandidateInState(state, found!.candidate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.deposits).toHaveLength(1);
    expect(result.state.deposits[0].amountMYR).toBe(5000);
    expect(result.state.deposits[0].completed).toBe(true);
    expect(result.journalEntry.recordSource).toBe('rakuten_import_nl');
    expect(result.candidate.status).toBe('confirmed');
  });

  it('cancelled candidate is not found with activeOnly and cannot be committed again', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    if (!built.ok) throw new Error('build failed');

    await saveImportBatch(built.batch);
    const rejected = {
      ...built.candidate,
      status: 'rejected' as const,
      rejectedAt: new Date().toISOString(),
    };
    await upsertImportCandidate(built.batch.id, rejected);

    const activeLookup = await findImportCandidate(built.candidate.id, { activeOnly: true });
    expect(activeLookup).toBeNull();

    const anyLookup = await findImportCandidate(built.candidate.id, { activeOnly: false });
    expect(anyLookup?.candidate.status).toBe('rejected');

    const commit = commitImportCandidateInState(state, rejected);
    expect(commit.ok).toBe(false);
    expect(state.deposits).toHaveLength(0);
  });

  it('returns null for candidateId / batchId mismatch only', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    if (!built.ok) throw new Error('build failed');

    await saveImportBatch(built.batch);

    expect(await findImportCandidate('import-candidate-nonexistent', { activeOnly: true })).toBeNull();
    expect(await findImportCandidate(built.batch.id, { activeOnly: true })).toBeNull();
  });

  it('fresh candidate is not immediately expired after staging', async () => {
    const state = createDefaultAppState();
    const built = buildNaturalLanguageImportCandidate('RM5000入金しました', { state });
    if (!built.ok) throw new Error('build failed');

    const stagedAt = Date.now();
    await saveImportBatch(built.batch);

    resetRakutenImportStagingMemoryForTest();
    await reloadRakutenImportStagingFromDisk();

    const found = await findImportCandidate(built.candidate.id, { activeOnly: true });
    expect(found).not.toBeNull();
    expect(Date.now() - stagedAt).toBeLessThan(60_000);
    expect(found!.candidate.createdAt).toBeTruthy();
  });
});
