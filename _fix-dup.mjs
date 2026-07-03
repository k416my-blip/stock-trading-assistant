import fs from 'node:fs';

const p = 'docs/review/device-verify-v44/run-v44-phase-b-final.mjs';
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const dup =
  "\n    record(`${key}-flow-${flow.key}-create`, created.ok, created.detail, created.evidence || []);\n\n    adbShell('input keyevent 4');";
const fixed = "\n\n    adbShell('input keyevent 4');";

if (s.includes(dup)) {
  s = s.replace(dup, fixed);
  fs.writeFileSync(p, s);
  console.log('removed duplicate create record');
} else {
  console.log('pattern not found, checking lines...');
  const idx = s.indexOf('created.ok, created.detail');
  console.log('idx', idx);
}
