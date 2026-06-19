/**
 * Production release smoke — monitor off, API key persistence, price/AI checks
 * node scripts/verify-production-aab-smoke.mjs [path-to-apk]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadAuditApiKeys, probeDeviceSecureStoreKeys, fingerprint } from './loadAuditApiKeys.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'review', 'production-aab-smoke');
const PKG = 'com.assistant.stocktrading';
const DEVICE = process.env.ANDROID_SERIAL ? `-s ${process.env.ANDROID_SERIAL}` : '';
const DEFAULT_APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

const results = [];

function sh(cmd) {
  const full = cmd.startsWith('adb ') ? cmd.replace(/^adb /, `adb ${DEVICE} `) : cmd;
  return execSync(full, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
}

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? 'PASS' : 'FAIL', id, detail);
}

function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/ui-prod-smoke.xml');
  const xml = sh('adb shell cat /sdcard/ui-prod-smoke.xml');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.xml`), xml, 'utf8');
  return xml;
}

function find(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    if (!pred(m[1])) continue;
    out.push({
      label: m[1],
      cx: Math.floor((+m[2] + +m[4]) / 2),
      cy: Math.floor((+m[3] + +m[5]) / 2),
    });
  }
  return out;
}

function tap(item) {
  sh(`adb shell input tap ${item.cx} ${item.cy}`);
}

async function waitReady(maxMs = 90_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const xml = dumpUi('boot');
    if (xml.length > 8000 && (xml.includes('ホーム') || xml.includes('保有銘柄') || xml.includes('コンシェルジュ'))) {
      return xml;
    }
    await sleep(3000);
  }
  throw new Error('app_not_ready');
}

async function checkMonitorAbsent(durationMs = 45_000) {
  sh('adb logcat -c');
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(500);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(durationMs);
  const log = sh('adb logcat -d -v brief');
  fs.writeFileSync(path.join(OUT, 'logcat-monitor-check.txt'), log.slice(-200000), 'utf8');
  const monitorLines = log.split('\n').filter((l) => l.includes('12H-MONITOR'));
  record('monitor-disabled', monitorLines.length === 0, `12H-MONITOR lines=${monitorLines.length}`);
  return monitorLines.length === 0;
}

async function navigateSettingsApi() {
  let xml = dumpUi('home-nav');
  const settings = find(xml, (l) => l.includes('設定') || l === 'Settings')[0];
  if (!settings) throw new Error('settings_not_found');
  tap(settings);
  await sleep(2000);
  xml = dumpUi('settings');
  const api = find(xml, (l) => l.includes('API') || l.includes('キー'))[0];
  if (!api) {
    const scroll = find(xml, (l) => l.includes('詳細'))[0];
    if (scroll) {
      tap(scroll);
      await sleep(1500);
      xml = dumpUi('settings-scroll');
    }
  }
  const api2 = find(xml, (l) => l.includes('API') || l.includes('キー'))[0];
  if (!api2) throw new Error('api_settings_not_found');
  tap(api2);
  await sleep(2000);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!sh('adb devices').includes('device')) {
    console.error('no device');
    process.exit(2);
  }

  const apkPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_APK;
  if (!fs.existsSync(apkPath)) {
    console.error('APK not found:', apkPath);
    process.exit(2);
  }

  const keys = loadAuditApiKeys();
  record('artifact', true, apkPath);

  sh(`adb install -r "${apkPath.replace(/\\/g, '/')}"`);
  await sleep(2000);

  sh('adb logcat -c');
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await waitReady();
  record('launch', true, 'app ready');

  const fatal = sh('adb logcat -d -v brief').split('\n').filter((l) => /FATAL EXCEPTION|AndroidRuntime.*FATAL/.test(l));
  record('no-crash-launch', fatal.length === 0, `fatal=${fatal.length}`);

  await checkMonitorAbsent();

  // API key registration (Twelve Data minimum for price)
  await navigateSettingsApi();
  let xml = dumpUi('api-screen');
  const tdLabel = find(xml, (l) => l.includes('Twelve Data'))[0];
  if (tdLabel && keys.twelveData) {
    const edits = [...xml.matchAll(/class="android.widget.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)];
    const tdEdit = edits.find((_, i) => i === 1) || edits[0];
    if (tdEdit) {
      const cx = Math.floor((+tdEdit[1] + +tdEdit[3]) / 2);
      const cy = Math.floor((+tdEdit[2] + +tdEdit[4]) / 2);
      sh(`adb shell input tap ${cx} ${cy}`);
      await sleep(300);
      sh(`adb shell input text "${keys.twelveData}"`);
      await sleep(500);
      const save = find(dumpUi('api-save'), (l) => l.includes('保存'))[0];
      if (save) {
        tap(save);
        await sleep(1500);
      }
    }
  }

  xml = dumpUi('api-after-save');
  const configured = xml.includes('設定済み') || xml.includes('****');
  record('api-key-save', configured, configured ? 'masked configured' : 'not configured');

  const before = probeDeviceSecureStoreKeys();
  sh(`adb install -r "${apkPath.replace(/\\/g, '/')}"`);
  await sleep(2000);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await waitReady();
  await navigateSettingsApi();
  xml = dumpUi('api-after-reinstall');
  const after = probeDeviceSecureStoreKeys();
  const persisted =
    configured &&
    (xml.includes('設定済み') || xml.includes('****')) &&
    fingerprint(before) === fingerprint(after);
  record('api-key-reinstall-r', persisted, `before=${fingerprint(before)} after=${fingerprint(after)}`);

  // Price refresh — portfolio tab
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(2000);
  xml = dumpUi('tabs');
  const port = find(xml, (l) => l.includes('保有銘柄'))[0];
  if (port) {
    tap(port);
    await sleep(3000);
    xml = dumpUi('portfolio');
    const refresh = find(xml, (l) => l.includes('更新') || l.includes('Refresh'))[0];
    if (refresh) {
      tap(refresh);
      await sleep(8000);
    }
    xml = dumpUi('portfolio-after-refresh');
    const priceOk = /\d+\.\d{2}/.test(xml) || xml.includes('MYR') || xml.includes('RM');
    record('price-update', priceOk, priceOk ? 'price pattern seen' : 'no price');
  } else {
    record('price-update', false, 'portfolio tab missing');
  }

  // AI analysis — concierge FAB or material tab
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(2000);
  xml = dumpUi('ai-nav');
  const mat = find(xml, (l) => l.includes('材料分析'))[0];
  if (mat) {
    tap(mat);
    await sleep(5000);
    xml = dumpUi('material');
    const aiOk = xml.length > 5000 && !xml.includes('FATAL');
    record('ai-analysis', aiOk, aiOk ? 'material screen loaded' : 'material failed');
  } else {
    record('ai-analysis', false, 'material tab missing');
  }

  const finalLog = sh('adb logcat -d -v brief');
  fs.writeFileSync(path.join(OUT, 'logcat-final.txt'), finalLog.slice(-300000), 'utf8');
  const fatals = finalLog.split('\n').filter((l) => /FATAL EXCEPTION|AndroidRuntime.*FATAL/.test(l));
  record('no-crash-final', fatals.length === 0, `fatal=${fatals.length}`);

  const report = {
    at: new Date().toISOString(),
    apkPath,
    results,
    allPass: results.every((r) => r.pass),
    verdict: results.every((r) => r.pass) ? 'PASS' : 'FAIL',
  };
  fs.writeFileSync(path.join(OUT, 'smoke-report.json'), JSON.stringify(report, null, 2));
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
