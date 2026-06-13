import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  backupCheckpointFile,
  CHECKPOINT_BACKUP_SUFFIX,
  isCheckpointWriteRetryableError,
  replaceCheckpointFile,
  writeCheckpointEmergency,
  writeCheckpointWithRetry,
} from '../../scripts/lib/phase12-5-checkpoint.mjs';

describe('phase12-5 checkpoint writer', () => {
  it('isCheckpointWriteRetryableError recognizes infra errno -4094 and EMFILE', () => {
    expect(isCheckpointWriteRetryableError({ code: 'UNKNOWN', errno: -4094 })).toBe(true);
    expect(isCheckpointWriteRetryableError({ code: 'EMFILE' })).toBe(true);
    expect(isCheckpointWriteRetryableError({ code: 'EINVAL' })).toBe(false);
  });

  it('writeCheckpointWithRetry performs atomic write and leaves backup', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    writeFileSync(checkpointPath, '{"before":true}\n', 'utf8');

    const result = await writeCheckpointWithRetry({
      checkpointPath,
      state: { ok: true, tag: 'test' },
    });

    expect(result.ok).toBe(true);
    expect(existsSync(`${checkpointPath}${CHECKPOINT_BACKUP_SUFFIX}`)).toBe(true);
    const saved = JSON.parse(readFileSync(checkpointPath, 'utf8'));
    expect(saved.ok).toBe(true);
    expect(saved.updatedAt).toBeTruthy();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writeCheckpointWithRetry retries retryable errors then succeeds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-retry-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    const warnings: string[] = [];
    const result = await writeCheckpointWithRetry({
      checkpointPath,
      state: { retry: true },
      maxRetries: 3,
      backoffMs: 1,
      mockFail: true,
      mockFailAfterAttempt: 2,
      logger: { warn: (msg: string) => warnings.push(msg), error: () => {} } as unknown as Console,
    });

    expect(result.ok).toBe(true);
    expect(warnings.length).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });

  it('writeCheckpointWithRetry returns warning after final failure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-fail-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    const result = await writeCheckpointWithRetry({
      checkpointPath,
      state: { fail: true },
      maxRetries: 3,
      backoffMs: 1,
      mockFail: true,
      mockFailAfterAttempt: 99,
      logger: { warn: () => {}, error: () => {} } as unknown as Console,
    });

    expect(result.ok).toBe(false);
    expect((result.warning as { code?: string })?.code).toBe('UNKNOWN');
    expect((result.warning as { errno?: number })?.errno).toBe(-4094);
    rmSync(dir, { recursive: true, force: true });
  });

  it('replaceCheckpointFile falls back to copy-unlink when rename fails', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-replace-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    const tmpPath = join(dir, 'checkpoint.json.tmp');
    writeFileSync(checkpointPath, 'old', 'utf8');
    writeFileSync(tmpPath, 'new', 'utf8');

    const fsMock = {
      existsSync: (p: string) => p === checkpointPath || p === tmpPath,
      unlinkSync: vi.fn(),
      renameSync: () => {
        throw Object.assign(new Error('rename blocked'), { code: 'EPERM' });
      },
      copyFileSync: vi.fn(),
    };

    const result = replaceCheckpointFile(fsMock, tmpPath, checkpointPath);
    expect(result.ok).toBe(true);
    expect(result.method).toBe('copy-unlink');
    expect(fsMock.copyFileSync).toHaveBeenCalledWith(tmpPath, checkpointPath);
    rmSync(dir, { recursive: true, force: true });
  });

  it('writeCheckpointEmergency writes .emergency file without throwing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-emerg-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    mkdirSync(dir, { recursive: true });
    const result = await writeCheckpointEmergency({
      checkpointPath,
      state: { emergency: true },
      logger: { error: () => {} } as unknown as Console,
    });
    expect(result.ok).toBe(true);
    expect(readFileSync(result.path!, 'utf8')).toContain('"emergency": true');
    rmSync(dir, { recursive: true, force: true });
  });

  it('backupCheckpointFile copies existing checkpoint to .bak', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p125-cp-bak-'));
    const checkpointPath = join(dir, 'checkpoint.json');
    writeFileSync(checkpointPath, '{"keep":1}', 'utf8');
    const backup = backupCheckpointFile(fs, checkpointPath);
    expect(backup).toBe(`${checkpointPath}${CHECKPOINT_BACKUP_SUFFIX}`);
    expect(readFileSync(backup!, 'utf8')).toContain('"keep":1');
    rmSync(dir, { recursive: true, force: true });
  });
});
