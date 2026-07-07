#!/usr/bin/env node
/**
 * Prune docs/review/device-verify-v44 — keep summary JSON only.
 * Usage: node prune-device-verify-artifacts.mjs [--archive]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join('docs', 'review', 'device-verify-v44');
const ARCHIVE = path.join('docs', 'archive', `device-verify-v44-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
const DO_ARCHIVE = process.argv.includes('--archive');

const KEEP_JSON = /^results-.*\.json$/i;
const KEEP_FAIL_JSON = /-fail\.json$/i;

function dirSize(dir) {
  if (!fs.existsSync(dir)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  for (const f of walk(dir)) {
    files += 1;
    bytes += fs.statSync(f).size;
  }
  return { files, bytes };
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function moveOrDelete(file, rel) {
  if (DO_ARCHIVE) {
    const dest = path.join(ARCHIVE, rel);
    ensureDir(path.dirname(dest));
    fs.renameSync(file, dest);
  } else {
    fs.unlinkSync(file);
  }
}

function shouldKeep(file, base) {
  const name = path.basename(file);
  if (KEEP_JSON.test(name)) return true;
  if (KEEP_FAIL_JSON.test(name) && file.includes('-artifacts')) return true;
  return false;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.log('PRUNE skip: missing', ROOT);
    return { before: { files: 0, bytes: 0 }, after: { files: 0, bytes: 0 }, removed: 0 };
  }
  const before = dirSize(ROOT);
  let removed = 0;
  let removedBytes = 0;

  for (const file of [...walk(ROOT)]) {
    const rel = path.relative(ROOT, file);
    const ext = path.extname(file).toLowerCase();
    if (shouldKeep(file, rel)) continue;
    const prune =
      ['.png', '.jpg', '.jpeg', '.webp', '.xml', '.log', '.jsonl'].includes(ext) ||
      rel.includes('-artifacts') && !KEEP_FAIL_JSON.test(path.basename(file));
    if (!prune) continue;
    const sz = fs.statSync(file).size;
    moveOrDelete(file, rel);
    removed += 1;
    removedBytes += sz;
  }

  // Remove empty artifact dirs
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.endsWith('-artifacts')) continue;
    const p = path.join(ROOT, ent.name);
    try {
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } catch {}
  }

  const after = dirSize(ROOT);
  const summary = {
    mode: DO_ARCHIVE ? 'archive' : 'delete',
    archivePath: DO_ARCHIVE ? ARCHIVE : null,
    beforeFiles: before.files,
    beforeMb: Math.round(before.bytes / 1024 / 1024 * 100) / 100,
    afterFiles: after.files,
    afterMb: Math.round(after.bytes / 1024 / 1024 * 100) / 100,
    removedFiles: removed,
    removedMb: Math.round(removedBytes / 1024 / 1024 * 100) / 100,
  };
  console.log('PRUNE-DONE', JSON.stringify(summary));
  fs.writeFileSync(path.join(ROOT, 'prune-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return summary;
}

main();
