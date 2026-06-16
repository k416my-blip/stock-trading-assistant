/**
 * Collect Foreground Service evidence on device (Phase 1).
 * Usage: node scripts/collect-fgs-evidence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const SERIAL = process.env.ANDROID_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const PKG = 'com.assistant.stocktrading';
const OUT = path.join(ROOT, 'docs/review/hyperos-screen-off-survival/fgs-evidence');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 30 * 1024 * 1024 }).trim();
}
function adb(cmd) {
  return sh(`adb -s ${SERIAL} ${cmd}`);
}
function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const runId = ts();
  adb(`shell am force-stop ${PKG}`);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(12_000);

  const files = {
    logcat: `${runId}-logcat.txt`,
    services: `${runId}-dumpsys-services.txt`,
    notifications: `${runId}-dumpsys-notification.txt`,
    power: `${runId}-dumpsys-power.txt`,
    package: `${runId}-dumpsys-package.txt`,
  };

  fs.writeFileSync(path.join(OUT, files.logcat), adb('logcat -d -v time'));
  fs.writeFileSync(path.join(OUT, files.services), adb(`shell dumpsys activity services ${PKG}`));
  fs.writeFileSync(path.join(OUT, files.notifications), adb('shell dumpsys notification --noredact'));
  fs.writeFileSync(path.join(OUT, files.power), adb('shell dumpsys power'));
  fs.writeFileSync(path.join(OUT, files.package), adb(`shell dumpsys package ${PKG}`));

  const apk = path.join(ROOT, 'artifacts/preview-v14.apk');
  let manifestNote = 'APK not present locally';
  if (fs.existsSync(apk)) {
    try {
      manifestNote = sh(
        `"C:\\Users\\k416m\\AppData\\Local\\Android\\Sdk\\build-tools\\36.0.0\\aapt.exe" dump xmltree "${apk}" AndroidManifest.xml`,
      );
    } catch (e) {
      manifestNote = String(e.message || e);
    }
  }
  fs.writeFileSync(path.join(OUT, `${runId}-apk-manifest-aapt.txt`), manifestNote);

  const summary = { runId, serial: SERIAL, files, outDir: OUT };
  fs.writeFileSync(path.join(OUT, `${runId}-summary.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
