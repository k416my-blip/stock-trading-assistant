/**
 * Concierge OpenAI root-cause — Maybank x5 consecutive runs
 * node scripts/bursa-concierge-openai-rootcause.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEVICE = process.env.ADB_DEVICE || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${DEVICE}`;
const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'concierge-openai-rootcause');
const RUN_COUNT = 5;
const PROMPT = 'Maybankを分析';
const WAIT_BETWEEN_RUNS_MS = 90_000;
const ENHANCED_WAIT_MS = 360_000;

const PROMPT_DEF = {
  id: 'maybank',
  text: PROMPT,
  altTexts: ['Maybankを分析', 'Maybank を分析', 'Maybankはどう？'],
};

function sh(cmd, opts = {}) {
  try {
    return execSync(`${ADB} ${cmd}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024,
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
    .replace(/apikey=[^&\s"']+/gi, 'apikey=****')
    .replace(/apiKey=[^&\s"']+/gi, 'apiKey=****')
    .replace(/Authorization[^\n]*/gi, 'Authorization: ****');
}

async function dumpUi(name) {
  sh('shell uiautomator dump /sdcard/concierge-rc.xml', { allowFail: true });
  await sleep(450);
  const raw = sh('shell cat /sdcard/concierge-rc.xml', { allowFail: true });
  if (raw.includes('<hierarchy')) {
    fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  }
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh('shell screencap -p /sdcard/concierge-rc-cap.png', { allowFail: true });
  sh(`pull /sdcard/concierge-rc-cap.png "${local}"`, { allowFail: true });
  return local;
}

function parseNodes(xml) {
  const re = /<node\b([^>]*)\/>|<node\b([^>]*)>/g;
  const nodes = [];
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1] ?? m[2] ?? '';
    const pick = (k) => {
      const mm = attrs.match(new RegExp(`${k}="([^"]*)"`));
      return mm ? mm[1] : '';
    };
    const bm = pick('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!bm) continue;
    nodes.push({
      text: pick('text'),
      contentDesc: pick('content-desc'),
      resourceId: pick('resource-id'),
      className: pick('class'),
      cx: Math.floor((+bm[1] + +bm[3]) / 2),
      cy: Math.floor((+bm[2] + +bm[4]) / 2),
      enabled: !/enabled="false"/.test(attrs),
    });
  }
  return nodes;
}

function findNodes(xml, pred) {
  return parseNodes(xml).filter(pred);
}

function tapNode(n) {
  sh(`shell input tap ${n.cx} ${n.cy}`);
}

function wake() {
  sh('shell input keyevent KEYCODE_WAKEUP', { allowFail: true });
  sh('shell wm dismiss-keyguard', { allowFail: true });
}

async function tapTab(label) {
  let xml = await dumpUi(`tab-${label}`);
  for (let i = 0; i < 10; i++) {
    const tabs = findNodes(
      xml,
      (n) =>
        n.text === label ||
        n.contentDesc === label ||
        (label === '材料分析' && (n.text.includes('材料') || n.contentDesc.includes('材料'))),
    );
    if (tabs.length) {
      tapNode(tabs.sort((a, b) => a.cy - b.cy)[0]);
      await sleep(5000);
      return;
    }
    sh('shell input swipe 900 2620 300 2620 350', { allowFail: true });
    await sleep(600);
    xml = await dumpUi(`tab-scroll-${i}`);
  }
  throw new Error(`tab missing: ${label}`);
}

async function scrollConciergeChat(name, direction = 'down') {
  if (direction === 'down') {
    sh('shell input swipe 610 1900 610 1200 280', { allowFail: true });
  } else {
    sh('shell input swipe 610 1200 610 1900 280', { allowFail: true });
  }
  await sleep(700);
  return dumpUi(name);
}

async function waitMaterial(maxMs = 300000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    let xml = await dumpUi('mat-wait');
    if (!xml.includes('材料分析') || xml.includes('資産運用コンシェルジュ')) {
      try {
        await tapTab('材料分析');
        xml = await dumpUi('mat-retap');
      } catch {
        /* continue */
      }
    }
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) {
      return { xml, loaded: true };
    }
    await sleep(4000);
  }
  const xml = await dumpUi('mat-final');
  return {
    xml,
    loaded: xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中'),
  };
}

async function openConciergeFab() {
  const xml = await dumpUi('fab-pre');
  const fab = findNodes(
    xml,
    (n) =>
      n.contentDesc === 'AIコンシェルジュを開く' ||
      n.contentDesc.includes('AIコンシェルジュ') ||
      n.contentDesc.includes('コンシェルジュを開く'),
  );
  if (!fab.length) throw new Error('FAB content-desc not found');
  tapNode(fab.sort((a, b) => b.cy - a.cy)[0]);
  await sleep(4500);
  return dumpUi('fab-open');
}

async function setClipboard(text) {
  const local = path.join(OUT, '_clipboard.txt');
  fs.writeFileSync(local, text, 'utf8');
  sh(`push "${local}" /sdcard/concierge-clip.txt`, { allowFail: true });
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  sh(`shell cmd clipboard put "${escaped}"`, { allowFail: true });
  sh(`shell am broadcast -a clipper.set -e text "${escaped}"`, { allowFail: true });
}

async function clearComposerField() {
  const xml = await dumpUi('composer-pre-clear');
  const field = findNodes(
    xml,
    (n) => n.className.includes('EditText') || n.text.includes('銘柄や方針') || n.resourceId.includes('composer'),
  );
  if (field[0]) tapNode(field.sort((a, b) => b.cy - a.cy)[0]);
  await sleep(400);
  for (let i = 0; i < 24; i++) sh('shell input keyevent 67', { allowFail: true });
  await sleep(200);
}

async function sendPrompt(promptDef) {
  let xml = await dumpUi(`prompt-${promptDef.id}-pre`);
  const quick = findNodes(xml, (n) => promptDef.altTexts.some((a) => n.text === a || n.text.includes(a)));
  if (quick[0]) {
    tapNode(quick[0]);
    await sleep(800);
    const sendBtn = findNodes(xml, (n) => n.contentDesc === '送信' || n.text === '送信');
    const enabledSend = sendBtn.find((n) => n.enabled);
    if (enabledSend) tapNode(enabledSend);
    else sh('shell input keyevent 66', { allowFail: true });
    return { method: 'quick-chip' };
  }

  await clearComposerField();
  xml = await dumpUi(`prompt-${promptDef.id}-composer`);
  const field = findNodes(
    xml,
    (n) => n.className.includes('EditText') || n.text.includes('銘柄や方針'),
  );
  if (field[0]) tapNode(field.sort((a, b) => b.cy - a.cy)[0]);
  await sleep(500);

  await setClipboard(promptDef.text);
  sh('shell input keyevent 279', { allowFail: true });
  await sleep(600);
  xml = await dumpUi(`prompt-${promptDef.id}-pasted`);
  if (!xml.includes('Maybank')) {
    sh('shell input text Maybank', { allowFail: true });
  }
  await sleep(500);

  xml = await dumpUi(`prompt-${promptDef.id}-filled`);
  let send = findNodes(xml, (n) => (n.contentDesc === '送信' || n.text === '送信') && n.enabled);
  if (!send.length) {
    send = findNodes(xml, (n) => n.contentDesc === '送信' || n.text === '送信');
  }
  if (send[0]) tapNode(send[0]);
  else sh('shell input keyevent 66', { allowFail: true });

  return { method: 'composer' };
}

async function waitForResponse(prefix, maxMs = ENHANCED_WAIT_MS) {
  const deadline = Date.now() + maxMs;
  let scrollRound = 0;
  let lastXml = '';
  while (Date.now() < deadline) {
    lastXml = await dumpUi(`${prefix}-poll-${scrollRound}`);
    const done =
      lastXml.includes('AI分析結果') ||
      lastXml.includes('モック応答') ||
      lastXml.includes('タイムアウト') ||
      lastXml.includes('モック応答に切替');
    const busy =
      lastXml.includes('考え中') ||
      lastXml.includes('回答を作成中') ||
      lastXml.includes('回答を表示中') ||
      lastXml.includes('処理中') ||
      lastXml.includes('モック応答に切替中');
    if (done && !busy) {
      return { xml: lastXml, settled: true, waitedMs: maxMs - (deadline - Date.now()) };
    }
    if (scrollRound % 2 === 0) await scrollConciergeChat(`${prefix}-scroll-${scrollRound}`, 'down');
    else await scrollConciergeChat(`${prefix}-scroll-${scrollRound}`, 'up');
    scrollRound++;
    await sleep(busy ? 10000 : 6000);
  }
  return { xml: lastXml, settled: false, waitedMs: maxMs };
}

function parseOpenAiLines(raw) {
  const lines = raw.split('\n').filter((l) => /\[CONCIERGE_OPENAI\]/.test(l));
  const parsed = [];
  for (const line of lines) {
    const quotedJson = line.match(/'(\{.*\})'/);
    if (quotedJson) {
      try {
        parsed.push(JSON.parse(quotedJson[1]));
        continue;
      } catch {
        /* fall through */
      }
    }
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;
    try {
      parsed.push(JSON.parse(line.slice(jsonStart)));
    } catch {
      parsed.push({ raw: line.slice(jsonStart) });
    }
  }
  return parsed;
}

function classifyRun(raw, openAiEvents) {
  const ends = openAiEvents.filter((e) => e.phase === 'request_end');
  const lastEnd = ends[ends.length - 1];
  const hasRequestStart = openAiEvents.some((e) => e.phase === 'request_start');

  if (!hasRequestStart) {
    return { category: 'G', label: 'no_openai_request', lastEnd: null };
  }
  if (!lastEnd) {
    return { category: 'G', label: 'request_started_no_end', lastEnd: null };
  }

  const parseResult = lastEnd.parseResult ?? '';
  const httpStatus = lastEnd.httpStatus;

  if (lastEnd.timeout === true || parseResult === 'timeout') {
    return { category: 'A', label: 'timeout', lastEnd };
  }
  if (httpStatus === 401 || parseResult === 'http_401') {
    return { category: 'B', label: 'http_401', lastEnd };
  }
  if (httpStatus === 429 || parseResult === 'http_429') {
    return { category: 'C', label: 'http_429', lastEnd };
  }
  if (
    parseResult === 'invalid_json' ||
    parseResult === 'invalid_json_content' ||
    parseResult === 'invalid_json_envelope'
  ) {
    return { category: 'D', label: 'parse_error', lastEnd };
  }
  if (parseResult === 'empty_response') {
    return { category: 'E', label: 'empty_response', lastEnd };
  }
  if (
    parseResult === 'network_or_throw' ||
    /network/i.test(String(lastEnd.error ?? '')) ||
    /fetch/i.test(String(lastEnd.error ?? ''))
  ) {
    return { category: 'F', label: 'network_error', lastEnd };
  }
  if (parseResult === 'ok') {
    return { category: 'PASS', label: 'openai_ok', lastEnd };
  }
  return { category: 'H', label: parseResult || 'unknown', lastEnd };
}

function parseEvidenceDiag(raw) {
  const lines = raw.split('\n').filter((l) =>
    /\[CONCIERGE_EVIDENCE_DIAG\]|\[CONCIERGE_SHORT_ANSWER\]|\[EVIDENCE_TRACE\]/.test(l),
  );
  return lines.slice(-20).map(redact);
}

async function runOnce(runIndex) {
  const prefix = `run-${runIndex}`;
  sh('logcat -c', { allowFail: true });
  await sleep(500);

  const sendMeta = await sendPrompt(PROMPT_DEF);
  shot(`${prefix}-sent`);
  const wait = await waitForResponse(prefix);
  shot(`${prefix}-result`);

  const logRaw = sh('logcat -d -s ReactNativeJS:W', { allowFail: true });
  const logPath = path.join(OUT, `logcat-run-${runIndex}.txt`);
  fs.writeFileSync(logPath, redact(logRaw.slice(-600000)), 'utf8');

  const openAiEvents = parseOpenAiLines(logRaw);
  const classification = classifyRun(logRaw, openAiEvents);
  const evidenceLines = parseEvidenceDiag(logRaw);

  const result = {
    runIndex,
    prompt: PROMPT,
    sendMeta,
    waitSettled: wait.settled,
    waitMs: wait.waitedMs,
    uiAiAnalysis: wait.xml.includes('AI分析結果'),
    uiMock: wait.xml.includes('モック応答'),
    uiTimeout: wait.xml.includes('タイムアウト'),
    openAiEventCount: openAiEvents.length,
    classification: classification.category,
    classificationLabel: classification.label,
    lastOpenAiEnd: classification.lastEnd,
    openAiEvents: openAiEvents.map((e) => ({
      phase: e.phase,
      elapsedMs: e.elapsedMs,
      httpStatus: e.httpStatus,
      responseSize: e.responseSize,
      parseResult: e.parseResult,
      timeout: e.timeout,
      timeoutMs: e.timeoutMs,
    })),
    evidenceLines,
    logcatFile: `logcat-run-${runIndex}.txt`,
  };

  fs.writeFileSync(path.join(OUT, `run-${runIndex}.json`), JSON.stringify(result, null, 2), 'utf8');
  console.log(
    `[run ${runIndex}] category=${classification.category} (${classification.label}) elapsed=${classification.lastEnd?.elapsedMs ?? 'n/a'}ms`,
  );
  return result;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let gitHead = 'unknown';
  try {
    gitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }

  const deviceList = sh('devices', { allowFail: true });
  if (!deviceList.includes(DEVICE)) {
    const summary = {
      status: 'BLOCKED',
      reason: 'device_not_connected',
      device: DEVICE,
      gitHead,
      runs: [],
    };
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.error(`Device ${DEVICE} not found. BLOCKED.`);
    process.exit(2);
  }

  const vc =
    sh(`shell dumpsys package ${PKG}`, { allowFail: true }).match(/versionCode=(\d+)/)?.[1] ?? null;

  wake();
  sh(`shell am start -W -S -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(16000);

  await tapTab('材料分析');
  shot('00-material-tab');
  const mat = await waitMaterial(300000);
  shot('01-material-loaded');

  let fabXml;
  try {
    fabXml = await openConciergeFab();
  } catch {
    sh(`shell am start -W -n ${PKG}/.MainActivity`, { allowFail: true });
    await sleep(8000);
    await tapTab('材料分析');
    await sleep(2000);
    fabXml = await openConciergeFab();
  }
  shot('02-concierge-open');

  const runs = [];
  for (let i = 1; i <= RUN_COUNT; i++) {
    runs.push(await runOnce(i));
    if (i < RUN_COUNT) {
      console.log(`[wait] ${WAIT_BETWEEN_RUNS_MS / 1000}s before run ${i + 1}...`);
      await sleep(WAIT_BETWEEN_RUNS_MS);
    }
  }

  const summary = {
    status: 'COMPLETE',
    gitHead,
    gitShort: gitHead.slice(0, 7),
    device: DEVICE,
    versionCode: vc,
    prompt: PROMPT,
    runCount: RUN_COUNT,
    timeoutMsConfigured: 60000,
    materialLoaded: mat.loaded,
    runs,
    categoryCounts: runs.reduce((acc, r) => {
      acc[r.classification] = (acc[r.classification] ?? 0) + 1;
      return acc;
    }, {}),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('[done] summary.json written');
  console.log(JSON.stringify(summary.categoryCounts));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
