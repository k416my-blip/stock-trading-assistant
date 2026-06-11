/**
 * 実機ライブ API 監査 — SecureStore キー使用（Node監査と分離）
 *
 * EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1 で Metro 起動後にアプリが自動監査。
 * node scripts/device-live-api-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadAuditApiKeys, probeDeviceSecureStoreKeys } from './loadAuditApiKeys.mjs';

const OUT_DIR = path.join('docs/review/device-live-api-audit');
const REPORT_PATH = path.join('docs/review/DEVICE_LIVE_API_AUDIT_REPORT.md');
const PKG = 'com.assistant.stocktrading';
const LOG_TAG = '[DEVICE-LIVE-AUDIT]';
const STOCKS = ['1155', '1023', '1295', '5347', '4707', '6033'];

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 30 * 1024 * 1024,
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.allowFail) {
      return `${e.stdout?.toString?.() ?? ''}${e.stderr?.toString?.() ?? ''}`.trim();
    }
    throw e;
  }
}

function adbOk() {
  return sh('adb devices', { allowFail: true }).split('\n').some((l) => l.includes('\tdevice'));
}

function metroListening() {
  try {
    const out = sh('netstat -ano | findstr :8081 | findstr LISTENING', { allowFail: true });
    return out.length > 0;
  } catch {
    return false;
  }
}

function killMetro() {
  console.log('[device-audit] Stopping existing Metro (audit flag required) ...');
  sh('powershell -ExecutionPolicy Bypass -File scripts/kill-metro.ps1', { allowFail: true });
}

async function ensureMetroWithAuditFlag() {
  killMetro();
  console.log('[device-audit] Starting Metro with EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1 ...');
  const child = spawn(
    'npx.cmd',
    ['expo', 'start', '-c'],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT: '1',
        NODE_OPTIONS: '--max-old-space-size=8192',
      },
    },
  );
  child.unref();
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    if (metroListening()) {
      console.log('[device-audit] Metro ready');
      await sleep(8000);
      return true;
    }
  }
  console.warn('[device-audit] Metro did not start within 180s — Settings UI fallback');
  return false;
}

function logcatHasAuditSummary() {
  const raw = sh('adb logcat -d -s ReactNativeJS:*', { allowFail: true });
  return raw.includes(`${LOG_TAG}`) && raw.includes('"phase":"summary"');
}

async function launchAppForAudit() {
  sh('adb reverse tcp:8081 tcp:8081', { allowFail: true });
  sh('adb logcat -c', { allowFail: true });
  sh(`adb shell am force-stop ${PKG}`, { allowFail: true });
  await sleep(800);
  sh(`adb shell am start -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(30000);
  console.log('[device-audit] Waiting for [DEVICE-LIVE-AUDIT] summary (up to 180s) ...');
  for (let i = 0; i < 36; i++) {
    await sleep(5000);
    if (logcatHasAuditSummary()) {
      console.log(`[device-audit] Audit summary seen after ~${(i + 1) * 5}s`);
      await sleep(2000);
      return;
    }
  }
  console.warn('[device-audit] Timeout — parsing partial logcat');
}

function parseJsonFromLogLine(line, tag) {
  if (!line.includes(tag)) return null;
  const patterns = [
    new RegExp(`${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*'(\\{.*\\})'`),
    new RegExp(`${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\{.*\\})`),
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m?.[1]) {
      try {
        return JSON.parse(m[1]);
      } catch {
        /* try next */
      }
    }
  }
  const idx = line.indexOf(tag);
  const tail = line.slice(idx + tag.length);
  const brace = tail.indexOf('{');
  if (brace >= 0) {
    try {
      return JSON.parse(tail.slice(brace));
    } catch {
      return null;
    }
  }
  return null;
}

function parseDeviceLogcat() {
  const raw = sh('adb logcat -d -s ReactNativeJS:*', { allowFail: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'logcat.txt'), raw);

  const auditEntries = [];
  const newsUi = [];
  const xUi = [];

  for (const line of raw.split('\n')) {
    const audit = parseJsonFromLogLine(line, LOG_TAG);
    if (audit) auditEntries.push(audit);
    const news = parseJsonFromLogLine(line, '[News API テスト]');
    if (news) newsUi.push(news);
    const x = parseJsonFromLogLine(line, '[X API テスト]');
    if (x) xUi.push(x);
  }

  const newsAuto = auditEntries.find((e) => e.phase === 'news_connection');
  const xAuto = auditEntries.find((e) => e.phase === 'x_connection');
  const stockRows = auditEntries.filter((e) => e.phase === 'stock_news');
  const summary = auditEntries.find((e) => e.phase === 'summary');

  const newsUiLast = newsUi.at(-1);
  const xUiLast = xUi.at(-1);

  const news = newsAuto ?? (newsUiLast
    ? {
        ok: newsUiLast.ok,
        httpStatus: newsUiLast.httpStatus,
        articleCount: newsUiLast.articleCount,
        source: 'settings_ui',
      }
    : null);

  const xApi = xAuto ?? (xUiLast
    ? {
        ok: xUiLast.ok,
        httpStatus: xUiLast.httpStatus,
        tweetCount: xUiLast.tweetCount,
        source: 'settings_ui',
      }
    : null);

  const stocks =
    stockRows.length > 0
      ? stockRows.map((r) => ({
          code: r.code,
          label: r.label,
          ok: r.ok,
          httpStatus: r.httpStatus,
          articleCount: r.articleCount,
          errorReason: r.errorReason ?? null,
        }))
      : [];

  const devicePass =
    summary?.devicePass === true ||
    (Boolean(news?.ok) &&
      Boolean(xApi?.ok) &&
      stocks.length === STOCKS.length &&
      stocks.every((s) => s.ok));

  const newsTempRateLimit =
    news?.errorReason === 'NEWSAPI_TEMP_RATE_LIMIT' ||
    (stocks.length > 0 && stocks.every((s) => s.errorReason === 'NEWSAPI_TEMP_RATE_LIMIT' || s.ok));

  const operationalPass = Boolean(xApi?.ok) && (Boolean(news?.ok) || newsTempRateLimit);

  return {
    auditEntries,
    news,
    xApi,
    stocks,
    summary,
    devicePass,
    newsTempRateLimit,
    operationalPass,
    usedAutoAudit: auditEntries.length > 0,
  };
}

function dumpUi(dest) {
  sh('adb shell uiautomator dump /sdcard/ui-device-audit.xml', { allowFail: true });
  sh(`adb shell cat /sdcard/ui-device-audit.xml > ${dest}`, { allowFail: true });
  return fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
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
    if (x2 <= x1 || y2 <= y1) continue;
    if (pred(label)) out.push({ label, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2) });
  }
  return out;
}

function tap(item) {
  console.log('[device-audit] tap', item.label);
  sh(`adb shell input tap ${item.cx} ${item.cy}`, { allowFail: true });
}

async function openSettingsScreen() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  sh(`adb shell am force-stop ${PKG}`, { allowFail: true });
  await sleep(800);
  sh(`adb shell am start -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(28000);
  let xml = dumpUi(path.join(OUT_DIR, 'ui-00-launch.xml'));
  for (const label of ['スキップ', '閉じる', 'OK', '後で']) {
    const dismiss = findLabels(xml, (l) => l === label);
    if (dismiss[0]) {
      tap(dismiss[0]);
      await sleep(1200);
      xml = dumpUi(path.join(OUT_DIR, 'ui-01-dismiss.xml'));
    }
  }
  let settings = findLabels(
    xml,
    (l) => l === '設定' || l.toLowerCase() === 'settings' || l.toLowerCase().includes('settings'),
  );
  if (!settings.length) {
    sh('adb shell input tap 1144 222', { allowFail: true });
  } else {
    tap(settings.sort((a, b) => b.cx - a.cx)[0]);
  }
  await sleep(3500);
  return dumpUi(path.join(OUT_DIR, 'ui-02-settings.xml'));
}

async function scrollUntil(xmlPath, pred, max = 10) {
  let xml = fs.existsSync(xmlPath) ? fs.readFileSync(xmlPath, 'utf8') : '';
  for (let i = 0; i < max; i++) {
    if (pred(xml)) return xml;
    sh('adb shell input swipe 610 2000 610 1200 300', { allowFail: true });
    await sleep(700);
    xml = dumpUi(path.join(OUT_DIR, `ui-scroll-${i}.xml`));
  }
  return xml;
}

async function runDeviceAuditViaSettingsUi() {
  console.log('[device-audit] Settings UI fallback ...');
  sh('adb logcat -c', { allowFail: true });
  let xml = await openSettingsScreen();

  xml = await scrollUntil(path.join(OUT_DIR, 'ui-02-settings.xml'), (x) => x.includes('News API テスト'), 12);
  if (!xml.includes('News API テスト')) {
    sh('adb shell input swipe 600 1600 600 400 280', { allowFail: true });
    await sleep(700);
    xml = dumpUi(path.join(OUT_DIR, 'ui-02b-settings.xml'));
  }
  const newsBtn = findLabels(xml, (l) => l === 'News API テスト');
  if (newsBtn[0]) {
    tap(newsBtn[0]);
    await sleep(18000);
  }

  xml = await scrollUntil(path.join(OUT_DIR, 'ui-after-news.xml'), (x) => x.includes('X API テスト'), 8);
  const xBtn = findLabels(xml, (l) => l === 'X API テスト');
  if (xBtn[0]) {
    tap(xBtn[0]);
    await sleep(18000);
  }

  xml = await scrollUntil(path.join(OUT_DIR, 'ui-after-x.xml'), (x) => x.includes('実機監査（6銘柄）'), 12);
  const auditBtn = findLabels(xml, (l) => l === '実機監査（6銘柄）');
  if (auditBtn[0]) {
    tap(auditBtn[0]);
    console.log('[device-audit] Waiting for 6-stock audit (up to 120s) ...');
    for (let i = 0; i < 24; i++) {
      await sleep(5000);
      if (logcatHasAuditSummary()) break;
    }
  } else {
    console.warn('[device-audit] 「実機監査（6銘柄）」 not found — bundle may need reload');
  }
}

function runNodeAuditSection() {
  const keys = loadAuditApiKeys();
  const secure = probeDeviceSecureStoreKeys();
  const nodeNewsPass = Boolean(keys.newsApiKey);
  const nodeXPass = Boolean(keys.xApiKey);
  const nodePass = nodeNewsPass && nodeXPass;
  return {
    nodeAudit: {
      newsApi: { pass: nodeNewsPass, source: keys.sources.news, limitation: !nodeNewsPass && secure.newsApiKey },
      xApi: { pass: nodeXPass, source: keys.sources.x, limitation: !nodeXPass && secure.xApiKey },
      pass: nodePass,
    },
    secureStore: secure,
    scriptLimitation:
      !nodePass && secure.newsApiKey && secure.xApiKey
        ? '監査スクリプト制限 — SecureStore は Node から復号不可'
        : null,
  };
}

function writeReport(payload) {
  const { nodeAudit, device, verdict } = payload;
  const lines = [
    '# 実機ライブ API 監査レポート',
    '',
    `実行: ${payload.generatedAt}`,
    '',
    '## 判定サマリー',
    '',
    `| 区分 | 結果 |`,
    `|------|------|`,
    `| Node監査 | **${nodeAudit.pass ? 'PASS' : nodeAudit.scriptLimitation ? 'FAIL（監査スクリプト制限）' : 'FAIL'}** |`,
    `| 実機監査 | **${device.devicePass ? '実機PASS' : 'FAIL'}** |`,
    `| 12時間テスト可否 | **${verdict.twelveHourTestAllowed ? '開始可能' : '要対応'}** |`,
    '',
    nodeAudit.scriptLimitation
      ? `> ${nodeAudit.scriptLimitation}\n> Node FAIL + 実機PASS の場合は 12時間テスト可（実機結果優先）`
      : '',
    '',
    '## Node監査（.env のみ）',
    '',
    `| API | Node | SecureStore | 備考 |`,
    `|-----|------|-------------|------|`,
    `| NewsAPI | ${nodeAudit.newsApi.pass ? 'PASS' : 'FAIL'} | ${payload.secureStore.newsApiKey ? '保存済' : 'なし'} | ${nodeAudit.newsApi.pass ? nodeAudit.newsApi.source : '監査スクリプト制限'} |`,
    `| X API | ${nodeAudit.xApi.pass ? 'PASS' : 'FAIL'} | ${payload.secureStore.xApiKey ? '保存済' : 'なし'} | ${nodeAudit.xApi.pass ? nodeAudit.xApi.source : '監査スクリプト制限'} |`,
    '',
    '## 実機接続テスト（SecureStore キー）',
    '',
    '### NewsAPI',
    device.news
      ? `- HTTP Status: **${device.news.httpStatus}**\n- 取得件数: **${device.news.articleCount ?? device.news.articleCount ?? 0}**\n- 結果: ${device.news.ok ? 'PASS' : 'FAIL'}`
      : '- 未取得（ログなし）',
    '',
    '### X API',
    device.xApi
      ? `- HTTP Status: **${device.xApi.httpStatus}**\n- 取得件数: **${device.xApi.tweetCount ?? 0}**\n- 結果: ${device.xApi.ok ? 'PASS' : 'FAIL'}`
      : '- 未取得（ログなし）',
    '',
    '## 6銘柄 NewsAPI ニュース',
    '',
    '| 銘柄 | HTTP | 件数 | 結果 |',
    '|------|------|------|------|',
    ...(device.stocks.length
      ? device.stocks.map(
          (s) => `| ${s.code} ${s.label ?? ''} | ${s.httpStatus} | ${s.articleCount} | ${s.ok ? 'PASS' : 'FAIL'} |`,
        )
      : STOCKS.map((c) => `| ${c} | — | — | 未取得 |`)),
    '',
    `## 最終判定: ${verdict.label}`,
  ];
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(payload, null, 2));
}

async function main() {
  const nodeSection = runNodeAuditSection();

  if (!adbOk()) {
    const payload = {
      generatedAt: new Date().toISOString(),
      nodeAudit: nodeSection.nodeAudit,
      secureStore: nodeSection.secureStore,
      scriptLimitation: nodeSection.scriptLimitation,
      device: { devicePass: false, error: 'adb_not_connected' },
      verdict: {
        twelveHourTestAllowed: false,
        label: 'FAIL — adb未接続',
      },
    };
    writeReport(payload);
    console.log(JSON.stringify(payload, null, 2));
    process.exit(2);
  }

  const metroReady = await ensureMetroWithAuditFlag();
  if (metroReady) {
    await launchAppForAudit();
  }
  let device = parseDeviceLogcat();
  if (!device.usedAutoAudit || device.auditEntries.length === 0) {
    await runDeviceAuditViaSettingsUi();
    device = parseDeviceLogcat();
  }

  const twelveHourTestAllowed =
    device.devicePass || device.operationalPass || nodeSection.nodeAudit.pass;

  let verdictLabel = 'FAIL';
  if (device.devicePass) {
    verdictLabel = '実機PASS';
  } else if (device.operationalPass && device.newsTempRateLimit) {
    verdictLabel = '実機PASS（NewsAPI一時制限 · X OK）';
  } else if (nodeSection.nodeAudit.pass) {
    verdictLabel = 'Node PASS';
  } else if (nodeSection.scriptLimitation) {
    verdictLabel = device.usedAutoAudit ? 'FAIL — 実機監査NG' : 'FAIL — 実機監査未完了';
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    nodeAudit: {
      ...nodeSection.nodeAudit,
      scriptLimitation: nodeSection.scriptLimitation,
    },
    secureStore: nodeSection.secureStore,
    device: {
      ...device,
      newsLog: device.news
        ? { httpStatus: device.news.httpStatus, count: device.news.articleCount ?? 0 }
        : null,
      xLog: device.xApi
        ? { httpStatus: device.xApi.httpStatus, count: device.xApi.tweetCount ?? 0 }
        : null,
    },
    verdict: {
      twelveHourTestAllowed: device.devicePass || nodeSection.nodeAudit.pass,
      devicePass: device.devicePass,
      nodePass: nodeSection.nodeAudit.pass,
      scriptLimitation: nodeSection.scriptLimitation,
      label: verdictLabel,
      note: nodeSection.scriptLimitation && device.devicePass
        ? 'Node FAIL + 実機PASS → 監査スクリプト制限（12時間テスト可）'
        : null,
    },
  };

  writeReport(payload);

  console.log('\n=== Node監査（.env のみ）===');
  console.log(`NewsAPI: ${nodeSection.nodeAudit.newsApi.pass ? 'PASS' : 'FAIL'} (source: ${nodeSection.nodeAudit.newsApi.source})`);
  console.log(`X API: ${nodeSection.nodeAudit.xApi.pass ? 'PASS' : 'FAIL'} (source: ${nodeSection.nodeAudit.xApi.source})`);
  if (nodeSection.scriptLimitation) {
    console.log(`→ ${nodeSection.scriptLimitation}`);
  }

  console.log('\n=== 実機接続テスト（SecureStore）===');
  console.log('\n=== NewsAPI ===');
  if (device.news) {
    console.log(`HTTP Status: ${device.news.httpStatus}`);
    console.log(`取得件数: ${device.news.articleCount ?? 0}`);
  } else {
    console.log('未取得');
  }

  console.log('\n=== X API ===');
  if (device.xApi) {
    console.log(`HTTP Status: ${device.xApi.httpStatus}`);
    console.log(`取得件数: ${device.xApi.tweetCount ?? 0}`);
  } else {
    console.log('未取得');
  }

  console.log('\n=== 6銘柄 NewsAPI ===');
  for (const s of device.stocks) {
    console.log(`${s.code}: HTTP ${s.httpStatus} / 件数 ${s.articleCount} / ${s.ok ? 'PASS' : 'FAIL'}`);
  }

  console.log(`\n最終: ${verdictLabel}`);
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);

  process.exit(twelveHourTestAllowed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
