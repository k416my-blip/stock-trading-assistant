/**
 * Phase12.5 checkpoint writer — atomic write, retry/backoff, backup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { isLogWriteWarningError } from './phase12-5-logcat-finalization.mjs';

export const CHECKPOINT_BACKUP_SUFFIX = '.bak';
export const DEFAULT_CHECKPOINT_RETRIES = 5;
export const DEFAULT_CHECKPOINT_BACKOFF_MS = 50;

export function isCheckpointWriteRetryableError(err) {
  if (!err || typeof err !== 'object') return false;
  if (isLogWriteWarningError(err)) return true;
  return err.code === 'EMFILE';
}

export function formatCheckpointWriteError(err) {
  if (!err) return 'unknown checkpoint write error';
  const parts = [err.code, err.errno != null ? `errno=${err.errno}` : null, err.syscall, err.path, err.message].filter(
    Boolean,
  );
  return parts.join(' ');
}

function fsyncFile(fd, fsImpl) {
  try {
    fsImpl.fsyncSync(fd);
  } catch {
    /* best effort */
  }
}

export function backupCheckpointFile(fsImpl, checkpointPath) {
  if (!fsImpl.existsSync(checkpointPath)) return null;
  const backupPath = `${checkpointPath}${CHECKPOINT_BACKUP_SUFFIX}`;
  fsImpl.copyFileSync(checkpointPath, backupPath);
  return backupPath;
}

export function replaceCheckpointFile(fsImpl, tmpPath, checkpointPath) {
  try {
    if (fsImpl.existsSync(checkpointPath)) {
      fsImpl.unlinkSync(checkpointPath);
    }
    fsImpl.renameSync(tmpPath, checkpointPath);
    return { ok: true, method: 'rename' };
  } catch (renameErr) {
    try {
      fsImpl.copyFileSync(tmpPath, checkpointPath);
      if (fsImpl.existsSync(tmpPath)) {
        fsImpl.unlinkSync(tmpPath);
      }
      return { ok: true, method: 'copy-unlink', renameWarning: renameErr?.message ?? String(renameErr) };
    } catch (copyErr) {
      return { ok: false, renameErr, copyErr };
    }
  }
}

export function writeCheckpointPayloadSync(fsImpl, checkpointPath, payloadText) {
  const dir = path.dirname(checkpointPath);
  fsImpl.mkdirSync(dir, { recursive: true });
  const tmpPath = `${checkpointPath}.tmp`;
  const fd = fsImpl.openSync(tmpPath, 'w');
  try {
    fsImpl.writeFileSync(fd, payloadText, 'utf8');
    fsyncFile(fd, fsImpl);
  } finally {
    fsImpl.closeSync(fd);
  }
  return replaceCheckpointFile(fsImpl, tmpPath, checkpointPath);
}

/**
 * Atomic checkpoint write with retry/backoff. Never throws.
 * @returns {{ ok: boolean, backupPath: string|null, warning: object|null, attempts: number }}
 */
export async function writeCheckpointWithRetry({
  fs: fsImpl = fs,
  checkpointPath,
  state,
  maxRetries = DEFAULT_CHECKPOINT_RETRIES,
  backoffMs = DEFAULT_CHECKPOINT_BACKOFF_MS,
  logger = console,
  mockFail = false,
  mockFailAfterAttempt = 0,
}) {
  const payloadText = JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2);
  let backupPath = null;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      if (mockFail && attempt <= mockFailAfterAttempt) {
        const err = new Error('mock checkpoint write failure');
        err.code = 'UNKNOWN';
        err.errno = -4094;
        err.syscall = 'open';
        err.path = checkpointPath;
        throw err;
      }

      if (fsImpl.existsSync(checkpointPath)) {
        backupPath = backupCheckpointFile(fsImpl, checkpointPath);
      }

      const replaceResult = writeCheckpointPayloadSync(fsImpl, checkpointPath, payloadText);
      if (!replaceResult.ok) {
        const err = replaceResult.copyErr ?? replaceResult.renameErr ?? new Error('checkpoint replace failed');
        throw err;
      }

      return { ok: true, backupPath, warning: null, attempts: attempt, replaceMethod: replaceResult.method };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isCheckpointWriteRetryableError(err)) {
        logger.warn(
          `[p12.5] WARN checkpoint write retry ${attempt}/${maxRetries}: ${formatCheckpointWriteError(err)}`,
        );
        await sleep(backoffMs * attempt);
        continue;
      }
      break;
    }
  }

  const warning = {
    at: new Date().toISOString(),
    code: lastErr?.code ?? 'CHECKPOINT_WRITE_FAILED',
    errno: lastErr?.errno ?? null,
    syscall: lastErr?.syscall ?? null,
    path: lastErr?.path ?? checkpointPath,
    message: formatCheckpointWriteError(lastErr),
    attempts: maxRetries,
    backupPath,
  };
  logger.error(`[p12.5] ERROR checkpoint write failed after ${maxRetries} attempts: ${warning.message}`);
  return { ok: false, backupPath, warning, attempts: maxRetries };
}

/**
 * Best-effort emergency checkpoint write when primary path fails during graceful invalid.
 */
export async function writeCheckpointEmergency({
  fs: fsImpl = fs,
  checkpointPath,
  state,
  logger = console,
}) {
  const emergencyPath = `${checkpointPath}.emergency`;
  try {
    fsImpl.mkdirSync(path.dirname(emergencyPath), { recursive: true });
    fsImpl.writeFileSync(
      emergencyPath,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString(), emergency: true }, null, 2),
      'utf8',
    );
    return { ok: true, path: emergencyPath };
  } catch (err) {
    logger.error(`[p12.5] ERROR emergency checkpoint write failed: ${formatCheckpointWriteError(err)}`);
    return { ok: false, path: null, warning: { message: formatCheckpointWriteError(err) } };
  }
}
