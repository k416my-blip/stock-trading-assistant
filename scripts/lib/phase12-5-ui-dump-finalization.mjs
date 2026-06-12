/**
 * Phase12.5 UI dump persistence — timestamped files, no legacy fixed-name overwrite.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  formatLogcatTimestamp,
  isLogWriteWarningError,
  resolveUniquePath,
} from './phase12-5-logcat-finalization.mjs';

/** Legacy fixed basename — never written by this module. */
export const LEGACY_DISMISS_BASENAME = 'dismiss.xml';

export function sanitizeUiDumpLabel(label) {
  const s = String(label ?? 'ui').trim();
  if (!s) return 'ui';
  return s.replace(/[^\w\u0080-\uFFFF.-]+/g, '_').replace(/_+/g, '_').slice(0, 80);
}

export function buildUiDumpBasename(label, ts = formatLogcatTimestamp()) {
  return `ui-dump-${sanitizeUiDumpLabel(label)}-${ts}.xml`;
}

/**
 * Save UI dump XML to a unique timestamped path under outDir.
 * Never throws — returns { ok, path, content, warning }.
 */
export function saveUiDumpSnapshot({
  outDir,
  label,
  content,
  now = new Date(),
  mockFail = false,
  writeFile = (filePath, data) => fs.writeFileSync(filePath, data, 'utf8'),
  existsSync = fs.existsSync,
  mkdirSync = fs.mkdirSync,
}) {
  const at = now.toISOString();
  const ts = formatLogcatTimestamp(now);
  const basename = buildUiDumpBasename(label, ts);
  const text = content == null ? '' : String(content);

  if (mockFail) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: 'MOCK_FAIL',
        message: `Simulated UI dump write failure for label=${label}`,
        label,
        source: 'mock',
        recoverable: true,
      },
    };
  }

  try {
    mkdirSync(outDir, { recursive: true });
  } catch (err) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: err.code ?? 'MKDIR_FAIL',
        errno: err.errno ?? null,
        message: err.message,
        label,
        source: 'mkdir',
        recoverable: isLogWriteWarningError(err),
      },
    };
  }

  const legacyPath = path.join(outDir, LEGACY_DISMISS_BASENAME);
  if (existsSync(legacyPath) && basename === LEGACY_DISMISS_BASENAME) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: 'LEGACY_PATH_BLOCKED',
        message: `Refusing to overwrite legacy fixed path ${LEGACY_DISMISS_BASENAME}`,
        label,
        source: 'policy',
        recoverable: true,
      },
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      path: null,
      content: '',
      warning: {
        at,
        code: 'EMPTY_CAPTURE',
        message: 'UI dump adb capture returned empty content',
        label,
        source: 'adb',
        recoverable: true,
      },
    };
  }

  let destPath;
  try {
    destPath = resolveUniquePath(outDir, basename);
  } catch (err) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: err.code ?? 'PATH_ALLOC_FAIL',
        errno: err.errno ?? null,
        message: err.message,
        label,
        source: 'resolveUniquePath',
        recoverable: false,
      },
    };
  }

  if (path.basename(destPath) === LEGACY_DISMISS_BASENAME) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: 'LEGACY_PATH_BLOCKED',
        message: `Refusing to write legacy fixed basename ${LEGACY_DISMISS_BASENAME}`,
        label,
        source: 'policy',
        recoverable: true,
      },
    };
  }

  try {
    writeFile(destPath, text);
    return { ok: true, path: destPath, content: text, warning: null };
  } catch (err) {
    return {
      ok: false,
      path: null,
      content: text,
      warning: {
        at,
        code: err.code ?? 'UNKNOWN',
        errno: err.errno ?? null,
        message: err.message,
        label,
        source: 'writeFile',
        recoverable: isLogWriteWarningError(err),
      },
    };
  }
}
