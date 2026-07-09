#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'docs');
const EXT = new Set(['.md', '.html', '.json', '.txt']);
const problems = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) { walk(full); continue; }
    const ext = path.extname(name.name).toLowerCase();
    if (!EXT.has(ext)) continue;
    checkFile(full);
  }
}

function checkFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.includes(0)) { problems.push(`${filePath}: contains NUL byte`); return; }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    problems.push(`${filePath}: UTF-8 BOM present`);
    return;
  }
  try { new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { problems.push(`${filePath}: invalid UTF-8`); }
}

walk(ROOT);
if (problems.length === 0) {
  console.log('check-docs-utf8: PASS');
  process.exit(0);
}
console.error('check-docs-utf8: FAIL');
for (const p of problems) console.error('  -', p);
process.exit(1);
