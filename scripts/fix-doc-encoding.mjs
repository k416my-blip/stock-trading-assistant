#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const args = process.argv.slice(2);
const encodingFlag = args.find((a) => a.startsWith('--encoding='));
const forcedEncoding = encodingFlag?.split('=')[1];
const files = args.filter((a) => !a.startsWith('--'));
if (files.length === 0) {
  console.error('Usage: node scripts/fix-doc-encoding.mjs [--encoding=shift_jis] <file>');
  process.exit(2);
}
for (const rel of files) {
  const filePath = path.resolve(process.cwd(), rel);
  const buf = fs.readFileSync(filePath);
  let text;
  let source = 'utf-8';
  const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
  if (forcedEncoding) {
    text = stripBom(new TextDecoder(forcedEncoding).decode(buf));
    source = forcedEncoding;
  } else {
    try { text = stripBom(new TextDecoder('utf-8', { fatal: true }).decode(buf)); }
    catch {
      for (const enc of ['shift_jis', 'windows-1252']) {
        try { text = stripBom(new TextDecoder(enc).decode(buf)); source = enc; break; } catch {}
      }
      if (text === undefined) { console.error(`${rel}: could not decode`); process.exit(1); }
    }
  }
  fs.writeFileSync(filePath, text, { encoding: 'utf8' });
  console.log(`${rel}: UTF-8 OK (from ${source})`);
}
