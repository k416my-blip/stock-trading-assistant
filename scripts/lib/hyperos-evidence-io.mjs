/**
 * Atomic JSON evidence writes — avoids Windows UNKNOWN/EBUSY on concurrent read.
 */
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { isLogWriteWarningError } from './phase12-5-logcat-finalization.mjs';

export async function writeJsonAtomic(filePath, data, { retries = 8, delayMs = 250 } = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const body = JSON.stringify(data, null, 2);
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        /* rename may still work on Windows */
      }
      fs.renameSync(tmp, filePath);
      return;
    } catch (err) {
      lastErr = err;
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (!isLogWriteWarningError(err) || attempt >= retries - 1) break;
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

export function writeJsonAtomicSync(filePath, data, { retries = 8, delayMs = 250 } = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const body = JSON.stringify(data, null, 2);
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      fs.renameSync(tmp, filePath);
      return;
    } catch (err) {
      lastErr = err;
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (!isLogWriteWarningError(err) || attempt >= retries - 1) break;
      const deadline = Date.now() + delayMs * (attempt + 1);
      while (Date.now() < deadline) {
        /* sync spin-wait */
      }
    }
  }
  throw lastErr;
}
