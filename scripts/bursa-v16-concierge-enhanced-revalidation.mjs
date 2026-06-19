/**
 * v16 Concierge Enhanced Analysis revalidation (OpenAI key on device)
 * node scripts/bursa-v16-concierge-enhanced-revalidation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEVICE = process.env.ADB_DEVICE || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${DEVICE}`;
const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'concierge-enhanced-revalidation');
const APK_BUILD_COMMIT = '9dda7c797fbc519a9128448b690de5a63e21ada9';
const PROMPTS = [
  { id: '1155', text: '1155を分析', altTexts: ['1155を分析', '1155 を分析', '1155はどう？'] },
  { id: 'maybank', text: 'Maybankを分析', altTexts: ['Maybankを分析', 'Maybank を分析', 'Maybankはどう？'] },
];

const PHASE24_MARKERS = [
  'Analyst Consensus Intelligence (Phase24)',
  'Source:',
  'Consensus:',
  'Target:',
  'Score:',
  'Confidence:',
];
const PHASE231_MARKERS = [
  'Phase23.1 Cross Signal',
  'Cross Signal:',
  'Direction:',
  'Alignment:',
  'Material Impact:',
];
const ENHANCED_MARKERS = ['AI分析結果', ...PHASE24_MARKERS, ...PHASE231_MARKERS];

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
    .replace(/Authorization[^\\n]*/gi, 'Authorization: ****');
}

async function dumpUi(name) {
  sh('shell uiautomator dump /sdcard/concierge-enh.xml', { allowFail: true });
  await sleep(450);
  const raw = sh('shell cat /sdcard/concierge-enh.xml', { allowFail: true });
  if (raw.includes('<hierarchy')) {
    fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  }
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh('shell screencap -p /sdcard/concierge-enh-cap.png', { allowFail: true });
  sh(`pull /sdcard/concierge-enh-cap.png "${local}"`, { allowFail: true });
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

function countMarkers(xml, markers) {
  return markers.filter((m) => xml.includes(m)).length;
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

async function scrollUntilAny(texts, prefix, max = 40) {
  let xml = await dumpUi(`${prefix}-0`);
  if (texts.some((t) => xml.includes(t))) return { xml, found: true, scrolls: 0, matched: texts.find((t) => xml.includes(t)) };
  for (let i = 1; i <= max; i++) {
    xml = await scrollConciergeChat(`${prefix}-${i}`, i % 3 === 0 ? 'up' : 'down');
    const hit = texts.find((t) => xml.includes(t));
    if (hit) return { xml, found: true, scrolls: i, matched: hit };
  }
  return { xml, found: false, scrolls: max, matched: null };
}

async function waitMaterial(maxMs = 480000) {
  const deadline = Date.now() + maxMs;
  let lastRefresh = 0;
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
    if (Date.now() - lastRefresh > 45000) {
      const ref = findNodes(xml, (n) => n.text === '再取得');
      if (ref[0]) {
        tapNode(ref[0]);
        lastRefresh = Date.now();
        await sleep(12000);
        continue;
      }
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
    return { method: 'quick-chip', chip: quick[0].text };
  }

  await clearComposerField();
  xml = await dumpUi(`prompt-${promptDef.id}-composer`);
  const field = findNodes(
    xml,
    (n) => n.className.includes('EditText') || n.text.includes('銘柄や方針'),
  );
  if (field[0]) tapNode(field.sort((a, b) => b.cy - a.cy)[0]);
  await sleep(500);

  if (/[^\x00-\x7F]/.test(promptDef.text)) {
    await setClipboard(promptDef.text);
    sh('shell input keyevent 279', { allowFail: true });
    await sleep(600);
    xml = await dumpUi(`prompt-${promptDef.id}-pasted`);
    if (!xml.includes('1155') && !xml.includes('Maybank') && promptDef.id === '1155') {
      sh('shell input text 1155', { allowFail: true });
    }
    if (!xml.includes('Maybank') && promptDef.id === 'maybank') {
      sh('shell input text Maybank', { allowFail: true });
    }
  } else {
    sh(`shell input text ${promptDef.text.replace(/ /g, '%s')}`, { allowFail: true });
  }
  await sleep(500);

  xml = await dumpUi(`prompt-${promptDef.id}-filled`);
  let send = findNodes(xml, (n) => (n.contentDesc === '送信' || n.text === '送信') && n.enabled);
  if (!send.length) {
    send = findNodes(xml, (n) => n.contentDesc === '送信' || n.text === '送信');
  }
  if (send[0]) tapNode(send[0]);
  else sh('shell input keyevent 66', { allowFail: true });

  return { method: 'composer', filled: true };
}

async function waitForEnhanced(prefix, maxMs = 300000) {
  const deadline = Date.now() + maxMs;
  let lastXml = '';
  let scrollRound = 0;
  while (Date.now() < deadline) {
    lastXml = await dumpUi(`${prefix}-poll-${scrollRound}`);
    if (lastXml.includes('AI分析結果')) {
      return { xml: lastXml, found: true, waitedMs: maxMs - (deadline - Date.now()) };
    }
    const busy =
      lastXml.includes('考え中') ||
      lastXml.includes('回答を作成中') ||
      lastXml.includes('回答を表示中') ||
      lastXml.includes('処理中');
    if (!busy && scrollRound > 3 && lastXml.includes('タイムアウト')) {
      return { xml: lastXml, found: false, timedOutUi: true, waitedMs: maxMs - (deadline - Date.now()) };
    }
    if (scrollRound % 2 === 0) await scrollConciergeChat(`${prefix}-scroll-${scrollRound}`, 'down');
    else await scrollConciergeChat(`${prefix}-scroll-${scrollRound}`, 'up');
    scrollRound++;
    await sleep(busy ? 8000 : 5000);
  }
  return { xml: lastXml, found: false, timedOutUi: false, waitedMs: maxMs };
}

function parseOpenAiLogcat(raw) {
  const lines = raw.split('\n');
  const requests = lines.filter((l) => /\[CONCIERGE_OPENAI\]/.test(l));
  const responses = lines.filter((l) => /openai_response|api parse ok|\[ai-strategy\] api parse ok/.test(l));
  const errors = lines.filter((l) =>
    /\[ai-strategy\].*error|http_401|http_429|timeout|circuit_open|hallucination|fallback_mock|empty response|invalid json|AI API/i.test(l),
  );
  const gate = lines.filter((l) => /AI Input Gate|dataReliability|AI_INPUT_GATE|gate.*閉鎖/i.test(l));
  const shortAnswer = lines.filter((l) => /\[CONCIERGE_SHORT_ANSWER\]/.test(l));
  const targetSymbol = lines.filter((l) => /\[CONCIERGE_TARGET_SYMBOL\]/.test(l));
  const symbolFetch = lines.filter((l) => /\[CONCIERGE_SYMBOL_FETCH\]/.test(l));

  return {
    requestLines: requests.slice(-5).map(redact),
    responseLines: responses.slice(-5).map(redact),
    errorLines: errors.slice(-12).map(redact),
    gateLines: gate.slice(-8).map(redact),
    shortAnswerLines: shortAnswer.slice(-5).map(redact),
    targetSymbolLines: targetSymbol.slice(-5).map(redact),
    symbolFetchLines: symbolFetch.slice(-5).map(redact),
    hasRequest: requests.length > 0,
    hasResponse: responses.length > 0,
    hasTimeout: /timeout|タイムアウト/i.test(raw),
    hasGateClosed: /AI Input Gate.*閉鎖|gateClosed|aiInputGateClosed/i.test(raw),
    has401: /http_401|401/.test(raw),
    has429: /http_429|429/.test(raw),
  };
}

async function checkOpenAiKeyInSettings() {
  sh('shell input keyevent 4', { allowFail: true });
  await sleep(800);
  sh(`shell am start -W -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(6000);
  let xml = await dumpUi('settings-home');
  const gear = findNodes(xml, (n) => n.text === '設定');
  if (gear[0]) tapNode(gear[0]);
  await sleep(2500);
  xml = await dumpUi('settings-open');
  for (let i = 0; i < 20; i++) {
    if (xml.includes('OpenAI')) break;
    sh('shell input swipe 610 2100 610 700 350', { allowFail: true });
    await sleep(500);
    xml = await dumpUi(`settings-scroll-${i}`);
  }
  shot('00-settings-openai-section');
  const openAiConfigured =
    (xml.includes('OpenAI') && !/OpenAI[^\n]{0,80}未設定/.test(xml)) ||
    xml.includes('設定済') ||
    xml.includes('●') ||
    /OpenAI[\s\S]{0,200}保存/.test(xml);
  const openAiUnset = xml.includes('未設定') && xml.includes('OpenAI');
  sh('shell input keyevent 4', { allowFail: true });
  await sleep(500);
  return { openAiConfigured, openAiUnset, settingsSnippet: xml.slice(0, 12000) };
}

async function runPromptTest(promptDef, logOffset) {
  sh('logcat -c', { allowFail: true });
  await sleep(500);
  const sendMeta = await sendPrompt(promptDef);
  shot(`prompt-${promptDef.id}-sent`);
  const wait = await waitForEnhanced(`enh-${promptDef.id}`, 300000);
  shot(`prompt-${promptDef.id}-result`);
  const scroll = await scrollUntilAny(
    ['AI分析結果', 'Analyst Consensus Intelligence (Phase24)', 'Phase23.1 Cross Signal'],
    `enh-scroll-${promptDef.id}`,
    35,
  );
  const finalXml = scroll.found ? scroll.xml : wait.xml;
  const logRaw = sh('logcat -d', { allowFail: true });
  fs.writeFileSync(path.join(OUT, `logcat-${promptDef.id}.txt`), redact(logRaw.slice(-500000)), 'utf8');
  const openAi = parseOpenAiLogcat(logRaw);

  return {
    prompt: promptDef.text,
    sendMeta,
    enhancedFound: finalXml.includes('AI分析結果'),
    phase24Found: finalXml.includes('Analyst Consensus Intelligence (Phase24)'),
    phase231Found: finalXml.includes('Phase23.1 Cross Signal'),
    phase24Markers: countMarkers(finalXml, PHASE24_MARKERS),
    phase231Markers: countMarkers(finalXml, PHASE231_MARKERS),
    enhancedMarkers: countMarkers(finalXml, ENHANCED_MARKERS),
    uiGateClosed: finalXml.includes('AI Input Gate') && finalXml.includes('閉鎖'),
    uiOpenAiUnset: finalXml.includes('openai') && finalXml.includes('未設定'),
    uiTimeout: finalXml.includes('タイムアウト'),
    uiMock: finalXml.includes('モック応答'),
    wait,
    scroll,
    openAi,
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let gitHead = 'unknown';
  try {
    gitHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }
  const gitShort = gitHead.slice(0, 7);
  const vc = sh(`shell dumpsys package ${PKG}`, { allowFail: true }).match(/versionCode=(\d+)/)?.[1] ?? null;

  wake();
  sh('logcat -c', { allowFail: true });
  const fatalsBefore = (sh('logcat -d -s AndroidRuntime:E', { allowFail: true }).match(/FATAL EXCEPTION/g) ?? [])
    .length;

  const apiKeyState = await checkOpenAiKeyInSettings();

  sh(`shell am start -W -S -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(16000);

  await tapTab('材料分析');
  shot('01-material-tab');
  let xml = await dumpUi('mat-open');
  const ref = findNodes(xml, (n) => n.text === '再取得');
  if (ref[0]) {
    tapNode(ref[0]);
    await sleep(14000);
  }
  console.log('[material] waiting up to 8 min...');
  const mat = await waitMaterial(480000);
  shot('02-material-loaded');

  let fabXml;
  try {
    fabXml = await openConciergeFab();
  } catch (e) {
    sh(`shell am start -W -n ${PKG}/.MainActivity`, { allowFail: true });
    await sleep(8000);
    await tapTab('材料分析');
    await sleep(2000);
    fabXml = await openConciergeFab();
  }
  shot('03-concierge-open');

  const panelOpen =
    fabXml.includes('AIコンシェルジュ') ||
    fabXml.includes('銘柄や方針') ||
    fabXml.includes('送信');

  const promptResults = [];
  for (const p of PROMPTS) {
    console.log(`[prompt] ${p.text} ...`);
    if (!panelOpen) break;
    const r = await runPromptTest(p);
    promptResults.push(r);
    await sleep(4000);
  }

  const combinedXml = promptResults.map((r) => r.scroll?.xml ?? r.wait?.xml ?? '').join('\n');
  const anyEnhanced = promptResults.some((r) => r.enhancedFound);
  const anyPhase24 = promptResults.some((r) => r.phase24Found);
  const anyPhase231 = promptResults.some((r) => r.phase231Found);
  const anyOpenAiOk = promptResults.some((r) => r.openAi.hasResponse);
  const anyOpenAiReq = promptResults.some((r) => r.openAi.hasRequest);

  const fatalsAfter = (sh('logcat -d -s AndroidRuntime:E', { allowFail: true }).match(/FATAL EXCEPTION/g) ?? [])
    .length;
  const anr = /ANR in com\.assistant\.stocktrading/i.test(
    sh('logcat -d -s ActivityManager:I', { allowFail: true }),
  );

  const result = {
    gitHead,
    gitShort,
    apkBuildCommit: APK_BUILD_COMMIT,
    versionCode: vc ? Number(vc) : null,
    device: DEVICE,
    startedAt: new Date().toISOString(),
    apiKeyState,
    materialLoaded: mat.loaded,
    concierge: {
      fabMethod: 'content-desc',
      panelOpen,
    },
    prompts: promptResults,
    summary: {
      aiAnalysisResult: anyEnhanced ? 'PASS' : 'FAIL',
      openAiComm: anyOpenAiOk ? 'PASS' : anyOpenAiReq ? 'PARTIAL' : 'FAIL',
      phase24Integration: anyPhase24 ? 'PASS' : 'FAIL',
      phase231Integration: anyPhase231 ? 'PASS' : 'FAIL',
    },
    combinedMarkers: {
      enhanced: countMarkers(combinedXml, ['AI分析結果']),
      phase24: countMarkers(combinedXml, PHASE24_MARKERS),
      phase231: countMarkers(combinedXml, PHASE231_MARKERS),
    },
    crashFree: fatalsAfter === fatalsBefore && !anr,
    fatalsBefore,
    fatalsAfter,
    anr,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')),
  };

  fs.writeFileSync(path.join(OUT, 'revalidation-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
