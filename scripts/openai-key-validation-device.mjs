/**
 * OpenAI API key validation via Settings screen connection test.
 * node scripts/openai-key-validation-device.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'openai-key-validation');
const PKG = 'com.assistant.stocktrading';
const DEVICE = process.env.ADB_DEVICE || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${DEVICE}`;

function sh(cmd, opts = {}) {
  try {
    return execSync(`${ADB} ${cmd}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 40 * 1024 * 1024,
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.allowFail) {
      return `${e.stdout?.toString?.() ?? ''}${e.stderr?.toString?.() ?? ''}`.trim();
    }
    throw e;
  }
}

function redact(text) {
  return String(text)
    .replace(/sk-[a-zA-Z0-9_-]{8,}/gi, 'sk-****')
    .replace(/Bearer\s+[a-zA-Z0-9._-]{8,}/gi, 'Bearer ****')
    .replace(/apiKey=[^&\s"']+/gi, 'apiKey=****')
    .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"****"');
}

function dumpUi(name) {
  sh('shell uiautomator dump /sdcard/openai-val.xml', { allowFail: true });
  const raw = sh('shell cat /sdcard/openai-val.xml', { allowFail: true });
  fs.mkdirSync(OUT, { recursive: true });
  if (raw.includes('<hierarchy')) {
    fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  }
  return raw;
}

function findLabels(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    const x1 = +m[2];
    const y1 = +m[3];
    const x2 = +m[4];
    const y2 = +m[5];
    if (pred(label)) out.push({ label, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2), y1, y2 });
  }
  return out.sort((a, b) => a.y1 - b.y1);
}

function tap(item) {
  sh(`shell input tap ${item.cx} ${item.cy}`, { allowFail: true });
}

function extractProviderBlock(xml, title) {
  const idx = xml.indexOf(title);
  if (idx < 0) return null;
  const slice = xml.slice(idx, idx + 4500);
  const saveMatch = slice.match(/保存状態:\s*([^<"]+)/);
  const connMatch = slice.match(/接続状態:\s*([^<"]+)/);
  return {
    saveStatus: saveMatch?.[1]?.trim() ?? null,
    connStatus: connMatch?.[1]?.trim() ?? null,
  };
}

async function dismissAlerts(xml) {
  for (const label of ['OK', '閉じる', 'スキップ', '後で', 'キャンセル']) {
    const hits = findLabels(xml, (l) => l === label);
    if (hits[0]) {
      tap(hits[0]);
      await sleep(1200);
      xml = dumpUi('alert-dismiss');
    }
  }
  return xml;
}

async function ensureApp() {
  sh('shell input keyevent KEYCODE_WAKEUP', { allowFail: true });
  sh('shell wm dismiss-keyguard', { allowFail: true });
  sh(`shell am force-stop ${PKG}`, { allowFail: true });
  await sleep(800);
  sh('logcat -c', { allowFail: true });
  sh(`shell am start -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(16000);
  let xml = dumpUi('00-launch');
  return dismissAlerts(xml);
}

async function openSettings(xml) {
  let settings = findLabels(xml, (l) => l === '設定' || l.toLowerCase().includes('settings'));
  if (!settings.length) {
    for (let i = 0; i < 6; i++) {
      sh('shell input swipe 900 2620 300 2620 350', { allowFail: true });
      await sleep(700);
      xml = dumpUi(`tab-scroll-${i}`);
      settings = findLabels(xml, (l) => l === '設定' || l.includes(', 設定'));
      if (settings.length) break;
    }
  }
  if (!settings.length) {
    sh('shell input tap 1144 223', { allowFail: true });
  } else {
    tap(settings.sort((a, b) => b.cx - a.cx)[0]);
  }
  await sleep(4500);
  return dumpUi('01-settings');
}

async function scrollToProvider(xml, title) {
  for (let i = 0; i < 16; i++) {
    if (xml.includes(title)) return xml;
    sh('shell input swipe 610 2000 610 900 300', { allowFail: true });
    await sleep(700);
    xml = dumpUi(`scroll-${title.replace(/\s/g, '_')}-${i}`);
  }
  return xml;
}

async function tapOpenAiConnectionTest(xml) {
  xml = await scrollToProvider(xml, 'OpenAI API');
  const titleNodes = findLabels(xml, (l) => l === 'OpenAI API' || l.startsWith('OpenAI'));
  if (!titleNodes.length) return { xml, tapped: false };
  const yStart = titleNodes[0].y1;
  const tests = findLabels(xml, (l) => l === '接続テスト' || l === 'テスト中…').filter(
    (t) => t.y1 >= yStart && t.y1 <= yStart + 900,
  );
  const target = tests[0] ?? findLabels(xml, (l) => l === '接続テスト')[0];
  if (!target) return { xml, tapped: false };
  tap(target);
  await sleep(20000);
  xml = dumpUi('after-openai-test');
  xml = await dismissAlerts(xml);
  return { xml, tapped: true };
}

function parseOpenAiLog(lines) {
  const hits = lines.filter((l) => /\[openai-test\]|openai-test/i.test(l));
  const result = {
    logLines: hits.slice(-12).map(redact),
    httpStatus: null,
    ok: null,
    outcome: null,
    messageJa: null,
    parseSuccess: null,
    model: null,
    responseSummary: null,
    timedOut: null,
  };

  for (const line of [...hits].reverse()) {
    try {
      const jsonStart = line.indexOf('{');
      if (jsonStart >= 0) {
        const parsed = JSON.parse(line.slice(jsonStart));
        if (parsed.statusCode != null) result.httpStatus = parsed.statusCode;
        if (parsed.httpStatus != null) result.httpStatus = parsed.httpStatus;
        if (parsed.model) result.model = parsed.model;
        if (typeof parsed.parseSuccess === 'boolean') result.parseSuccess = parsed.parseSuccess;
        if (typeof parsed.timedOut === 'boolean') result.timedOut = parsed.timedOut;
        if (parsed.errorType) result.outcome = parsed.errorType;
        if (parsed.endpoint) result.responseSummary = `endpoint=${parsed.endpoint}`;
      }
    } catch {
      /* ignore */
    }
    const statusM = line.match(/"statusCode"\s*:\s*(\d+)/) || line.match(/httpStatus['":\s]+(\d{3})/i);
    if (statusM && result.httpStatus == null) result.httpStatus = +statusM[1];
    const outcomeM = line.match(/"outcome"\s*:\s*"([^"]+)"/);
    if (outcomeM) result.outcome = outcomeM[1];
    const msgM = line.match(/"messageJa"\s*:\s*"([^"]+)"/);
    if (msgM) result.messageJa = msgM[1];
  }

  if (hits.some((l) => l.includes('実API接続成功') || l.includes('complete'))) result.ok = true;
  if (hits.some((l) => l.includes('invalid_key') || l.includes('http error'))) {
    if (result.ok !== true) result.ok = false;
  }

  return result;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const devices = sh('devices', { allowFail: true });
  if (!devices.includes(DEVICE)) {
    const blocked = { status: 'BLOCKED', reason: 'device_not_connected', device: DEVICE, commit };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(blocked, null, 2));
    console.error('Device not connected');
    process.exit(2);
  }

  const vc =
    sh(`shell dumpsys package ${PKG}`, { allowFail: true }).match(/versionCode=(\d+)/)?.[1] ?? null;

  let xml = await ensureApp();
  xml = await openSettings(xml);
  xml = await scrollToProvider(xml, 'OpenAI API');
  const preBlock = extractProviderBlock(xml, 'OpenAI API');

  sh('logcat -c', { allowFail: true });
  const testRun = await tapOpenAiConnectionTest(xml);
  xml = testRun.xml;
  const postBlock = extractProviderBlock(xml, 'OpenAI API');

  const logRaw = sh('logcat -d -s ReactNativeJS:*', { allowFail: true });
  const sanitized = redact(logRaw);
  fs.writeFileSync(path.join(OUT, 'logcat-sanitized.txt'), sanitized, 'utf8');
  const logResult = parseOpenAiLog(sanitized.split('\n'));

  const report = {
    generatedAt: new Date().toISOString(),
    commit,
    commitShort: commit.slice(0, 7),
    device: DEVICE,
    package: PKG,
    versionCode: vc ? Number(vc) : null,
    preTest: preBlock,
    postTest: postBlock,
    connectionTestTapped: testRun.tapped,
    logResult,
    modelFromConstants: 'gpt-4o-mini',
    pass:
      postBlock?.connStatus?.includes('成功') ||
      logResult.ok === true ||
      logResult.outcome === 'success' ||
      logResult.outcome === 'none',
  };

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
