/**
 * dexdump evidence for v14 APK — StaNativeRuntimeModule + LongRunForegroundService.
 * Usage: node scripts/verify-v14-dex-evidence.mjs [apkPath]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const APK = process.argv[2] ?? path.join(ROOT, 'artifacts/preview-v14.apk');
const OUT = path.join(ROOT, 'docs/review/hyperos-screen-off-survival/fgs-evidence');
const DEXDUMP =
  process.env.ANDROID_DEXDUMP ??
  'C:\\Users\\k416m\\AppData\\Local\\Android\\Sdk\\build-tools\\36.0.0\\dexdump.exe';
const PATTERNS = [
  'StaNativeRuntimeModule',
  'StaNativeRuntime',
  'LongRunForegroundService',
  'stanativeruntime',
];

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 120 * 1024 * 1024 });
}

if (!fs.existsSync(APK)) {
  console.error(`APK missing: ${APK}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const runId = ts();
const tmp = path.join(ROOT, 'artifacts', `_v14_dex_${runId}`);
fs.mkdirSync(tmp, { recursive: true });
fs.copyFileSync(APK, path.join(tmp, 'apk.zip'));
sh(`powershell -NoProfile -Command "Expand-Archive -Path '${path.join(tmp, 'apk.zip')}' -DestinationPath '${tmp}' -Force"`);

const hits = {};
const dumpFiles = [];
for (const dex of fs.readdirSync(tmp).filter((f) => /^classes.*\.dex$/.test(f))) {
  const dexPath = path.join(tmp, dex);
  const outPath = path.join(OUT, `${runId}-dexdump-${dex}.txt`);
  sh(`"${DEXDUMP}" -f "${dexPath}" > "${outPath}"`);
  dumpFiles.push(outPath);
  const content = fs.readFileSync(outPath, 'utf8');
  hits[dex] = {};
  for (const pat of PATTERNS) {
    const re = new RegExp(pat, 'gi');
    hits[dex][pat] = (content.match(re) ?? []).length;
  }
}

const summary = {
  runId,
  apk: APK,
  apkBytes: fs.statSync(APK).size,
  patterns: PATTERNS,
  hits,
  dumpFiles: dumpFiles.map((f) => path.relative(ROOT, f)),
  passNativeDex:
    Object.values(hits).some((h) => h.StaNativeRuntimeModule > 0 || h.StaNativeRuntime > 0) &&
    Object.values(hits).some((h) => h.LongRunForegroundService > 0),
};

const summaryPath = path.join(OUT, `${runId}-dexdump-summary.json`);
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.passNativeDex ? 0 : 1);
