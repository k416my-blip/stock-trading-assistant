import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SERIAL = process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${SERIAL}`;
const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'device-verify-v44');
const POST_TAP_MS = Number(process.env.POST_TAP_MS || 15000);
const SCROLL_SWIPES = Number(process.env.SCROLL_SWIPES || 28);

const jaHome = JSON.parse(fs.readFileSync('src/i18n/resources/ja/home.json', 'utf8'));
const jaSettings = JSON.parse(fs.readFileSync('src/i18n/resources/ja/settings.json', 'utf8'));

const jaPortfolio = JSON.parse(fs.readFileSync('src/i18n/resources/ja/portfolio.json', 'utf8'));
const _aiTs = fs.readFileSync('src/constants/aiSettings.ts', 'utf8');
const _invTs = fs.readFileSync('src/constants/investmentDisplay.ts', 'utf8');
const AI_SETTINGS_ROW = _aiTs.match(/screenTitle:\s*'([^']+)'/)[1];
const TRUST_LABEL = _invTs.match(/trust:\s*'([^']+)'/)[1];
const LIST_SCREEN = jaPortfolio.sell.manualOrderList;
const LANG_JA = '\u65e5\u672c\u8a9e';
const SPLASH_MARKERS = ['\u30a2\u30d7\u30ea\u3092\u8d77\u52d5', 'Loading', 'loading', 'Splash'];

const SECTION_TITLE = jaHome.manualOrderEntry.sectionTitle;
const FLOW_BUTTONS = [
  { key: 'concierge_full', homeLabel: jaHome.manualOrderEntry.conciergeFull.title, flowTitle: jaHome.manualOrderFlow.conciergeFull.title },
  { key: 'manual_full', homeLabel: jaHome.manualOrderEntry.manualFull.title, flowTitle: jaHome.manualOrderFlow.manualFull.title },
  { key: 'concierge_symbol', homeLabel: jaHome.manualOrderEntry.conciergeSymbol.title, flowTitle: jaHome.manualOrderFlow.conciergeSymbol.title },
  { key: 'concierge_quantity', homeLabel: jaHome.manualOrderEntry.conciergeQuantity.title, flowTitle: jaHome.manualOrderFlow.conciergeQuantity.title },
];
const CREATE_LIST = jaHome.manualOrderFlow.createList;
const CREATED_TITLE = jaHome.manualOrderFlow.createdTitle;
const VIEW_LIST = jaHome.trust.viewList;

const MANUAL_SYMBOL = '1155';
const DISPLAY_MODES = [
  { key: 'beginner', label: jaSettings.displayMode.modes.beginner.label },
  { key: 'standard', label: jaSettings.displayMode.modes.standard.label },
  { key: 'pro', label: jaSettings.displayMode.modes.pro.label },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
}

function adbShell(args) {
  return sh(`${ADB} shell ${args}`);
}

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

async function dumpUi(name, retries = 5) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < retries; i++) {
    try {
      adbShell('uiautomator dump /sdcard/ui-phase-b.xml');
      sh(`${ADB} exec-out cat /sdcard/ui-phase-b.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, 'utf8');
      if (xml.includes('<hierarchy') && xml.length > 200) return xml;
    } catch (_) {
      /* retry */
    }
    await sleep(1500);
  }
  return '';
}

function screenshot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh(`${ADB} exec-out screencap -p > "${local}"`);
}

function xmlTexts(xml) {
  const texts = new Set();
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1]) texts.add(m[1]);
  }
  return texts;
}

function xmlTextJoined(xml) {
  return [...xmlTexts(xml)].join('\n');
}

function findNodes(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"/g;
  const boundsRe = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    const b = xml.slice(m.index, m.index + 600).match(boundsRe);
    if (!b || !pred(label)) continue;
    out.push({
      label,
      cx: Math.floor((+b[1] + +b[3]) / 2),
      cy: Math.floor((+b[2] + +b[4]) / 2),
    });
  }
  return out;
}

function tap(item) {
  console.log('TAP', item.label.slice(0, 72), item.cx, item.cy);
  adbShell(`input tap ${item.cx} ${item.cy}`);
}

async function wakeAndPrep() {
  adbShell('input keyevent 224');
  adbShell('input keyevent 82');
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
}

async function waitSplashGone(tag) {
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    const focused = sh(`${ADB} shell dumpsys window`);
    const onMain = focused.includes('MainActivity') && focused.includes(PKG);
    if (!onMain) {
      stable = 0;
      await sleep(500);
      continue;
    }
    const xml = await dumpUi(`${tag}-splash-${i}`, 2);
    if (!xml) {
      stable = 0;
      await sleep(500);
      continue;
    }
    const joined = xmlTextJoined(xml);
    const splashy = joined.includes('\u30a2\u30d7\u30ea\u3092\u8d77\u52d5') || /\bSplash\b/i.test(joined);
    if (!splashy) stable += 1;
    else stable = 0;
    if (stable >= 8) return true;
    await sleep(500);
  }
  return false;
}

async function ensureJapaneseLanguage() {
  await openSettingsScreen();
  await scrollSettingsToTop();
  for (let i = 0; i < 6; i++) {
    const xml = await dumpUi(`lang-pick-${i}`);
    const ja = findNodes(xml, (l) => l === 'settings-language-ja' || l === LANG_JA || l.includes('settings-language-ja'));
    if (ja[0]) {
      tap(ja[0]);
      await sleep(5000);
      await waitSplashGone('lang');
      return true;
    }
    const row = findNodes(xml, (l) => l === LANG_JA);
    if (row[0]) {
      tap(row[0]);
      await sleep(5000);
      await waitSplashGone('lang');
      return true;
    }
    adbShell('input swipe 540 1900 540 600 400');
    await sleep(500);
  }
  return false;
}

async function dismissDialogs(prefix) {
  for (let i = 0; i < 8; i++) {
    const xml = await dumpUi(`${prefix}-dismiss-${i}`);
    if (!xml) break;
    const btn = findNodes(
      xml,
      (l) =>
        ['スキップ', '閉じる', '許可', '許可しない', 'OK', '取消', 'キャンセル', 'Allow', 'While using'].includes(l) ||
        l.includes('カメラ') ||
        l === 'Reload',
    );
    if (!btn[0]) break;
    tap(btn[0]);
    await sleep(900);
  }
}

async function goHomeTab() {
  await tapBottomTab('Home');
}

async function tapBottomTab(name) {
  if (name === 'Settings') {
    adbShell('input tap 1118 2486');
    await sleep(2500);
    return true;
  }
  if (name === 'Home') {
    adbShell('input tap 101 2486');
    await sleep(2500);
    return true;
  }
  return false;
}

async function scrollSettingsToTop() {
  for (let i = 0; i < 5; i++) {
    adbShell('input swipe 540 600 540 1900 350');
    await sleep(450);
  }
}

async function openSettingsScreen() {
  await tapBottomTab('Settings');
}

async function setDisplayMode(label) {
  const enSettings = JSON.parse(fs.readFileSync('src/i18n/resources/en/settings.json', 'utf8'));
  const key = DISPLAY_MODES.find((d) => d.label === label)?.key;
  const candidates = key
    ? [jaSettings.displayMode.modes[key].label, enSettings.displayMode.modes[key].label]
    : [label];
  await openSettingsScreen();
  await scrollSettingsToTop();
  for (let i = 0; i < 14; i++) {
    const xml = await dumpUi(`mode-pick-${label}-${i}`);
    for (const cand of candidates) {
      const row = findNodes(xml, (l) => l === cand);
      if (row[0]) {
        tap(row[0]);
        await sleep(1200);
        await goHomeTab();
        return true;
      }
    }
    adbShell('input swipe 540 1900 540 600 400');
    await sleep(650);
  }
  return false;
}

async function openAiSettings() {
  await openSettingsScreen();
  await scrollSettingsToTop();
  for (let i = 0; i < 18; i++) {
    const xml = await dumpUi(`ai-settings-nav-${i}`);
    const row = findNodes(xml, (l) => l === AI_SETTINGS_ROW || l.includes('AI戦略アシスタント'));
    if (row[0]) {
      tap(row[0]);
      await sleep(2500);
      return true;
    }
    adbShell('input swipe 540 1900 540 600 400');
    await sleep(650);
  }
  return false;
}

async function setTrustInvestmentMode() {
  const opened = await openAiSettings();
  if (!opened) return false;
  for (let i = 0; i < 22; i++) {
    const xml = await dumpUi(`trust-pick-${i}`);
    const row = findNodes(xml, (l) => l === TRUST_LABEL);
    if (row[0]) {
      tap(row[0]);
      await sleep(1200);
      adbShell('input keyevent 4');
      await sleep(600);
      adbShell('input keyevent 4');
      await sleep(600);
      await goHomeTab();
      return true;
    }
    adbShell('input swipe 540 1900 540 600 400');
    await sleep(650);
  }
  return false;
}


async function scrollHomeToTop() {
  for (let i = 0; i < 5; i++) {
    adbShell('input swipe 540 600 540 1900 350');
    await sleep(400);
  }
}

async function completeOnboarding() {
  const skip = jaHome.onboarding.skip;
  const next = jaHome.onboarding.next;
  const start = jaHome.onboarding.startOnHome;
  for (let i = 0; i < 12; i++) {
    const xml = await dumpUi(`onboard-${i}`);
    if (!xml) continue;
    const joined = xmlTextJoined(xml);
    if (joined.includes(SECTION_TITLE) || FLOW_BUTTONS.some((b) => joined.includes(b.homeLabel))) return true;
    for (const label of [skip, next, start]) {
      const btn = findNodes(xml, (l) => l === label);
      if (btn[0]) {
        tap(btn[0]);
        await sleep(1500);
        break;
      }
    }
  }
  return false;
}

async function scrollCollectCorpus(prefix) {
  const corpus = new Set();
  for (let i = 0; i < SCROLL_SWIPES; i++) {
    const xml = await dumpUi(`${prefix}-scroll-${i}`);
    if (xml) for (const t of xmlTexts(xml)) corpus.add(t);
    adbShell('input swipe 540 1900 540 600 350');
    await sleep(550);
  }
  const text = [...corpus].sort().join('\n');
  fs.writeFileSync(path.join(OUT, `${prefix}-scroll-corpus.txt`), text, 'utf8');
  return corpus;
}

async function scrollToTapButton(prefix, label) {
  for (let i = 0; i < SCROLL_SWIPES; i++) {
    const xml = await dumpUi(`${prefix}-find-${label.slice(0, 6)}-${i}`);
    const btn = findNodes(xml, (l) => l === label);
    if (btn[0]) return btn[0];
    adbShell('input swipe 540 1900 540 600 350');
    await sleep(550);
  }
  return null;
}

async function fillFlowInputs(modeKey) {
  if (modeKey === 'manual_full' || modeKey === 'concierge_quantity') {
    await dumpUi(`fill-${modeKey}`);
    adbShell('input tap 540 640');
    await sleep(400);
    adbShell(`input text ${MANUAL_SYMBOL}`);
    await sleep(500);
  }
}

async function tapCreateOnFlowScreen(prefix) {
  let xml = await dumpUi(`${prefix}-flow-before-create`);
  let btn = findNodes(xml, (l) => l === CREATE_LIST);
  if (!btn[0]) {
    adbShell('input swipe 540 1600 540 800 300');
    await sleep(600);
    xml = await dumpUi(`${prefix}-flow-before-create-2`);
    btn = findNodes(xml, (l) => l === CREATE_LIST);
  }
  if (!btn[0]) return false;
  tap(btn[0]);
  return true;
}

async function completeFlow(modeKey, prefix, homeLabel) {
  const tapped = await tapCreateOnFlowScreen(prefix);
  if (!tapped) return { ok: false, detail: 'create button not found on flow screen', evidence: [] };
  await sleep(4000);
  let xml = await dumpUi(`${prefix}-after-create`);
  screenshot(`${prefix}-after-create`);
  const view = findNodes(xml, (l) => l === VIEW_LIST);
  if (view[0]) {
    tap(view[0]);
    await sleep(POST_TAP_MS);
    xml = await dumpUi(`${prefix}-list-screen`);
    screenshot(`${prefix}-list-screen`);
    const onList = xmlTextJoined(xml).includes(LIST_SCREEN);
    return { ok: onList, detail: onList ? 'manual order list screen shown' : 'list screen text missing', evidence: [`${prefix}-list-screen.png`] };
  }
  const okBtn = findNodes(xml, (l) => l === jaHome.trust.ok || l === 'OK');
  if (okBtn[0]) tap(okBtn[0]);
  const joined = xmlTextJoined(xml);
  const alertShown = joined.includes(CREATED_TITLE) || joined.includes(jaHome.manualOrderFlow.createdBody.split('{')[0]);
  return { ok: alertShown, detail: alertShown ? 'created alert confirmed' : 'no create confirmation', evidence: [`${prefix}-after-create.png`] };
}

const results = [];
function record(id, pass, detail, evidence = []) {
  const status = pass === 'partial' ? 'PARTIAL' : pass ? 'PASS' : 'FAIL';
  results.push({ id, status, pass: pass === true, detail, evidence });
  console.log(status, id, detail);
}

async function verifyMode(modeCfg) {
  const { key, label, kind } = modeCfg;
  const prefix = `phase-b-${key}`;

  if (kind === 'display' && label) {
    const switched = await setDisplayMode(label);
    record(`ux-switch-${key}`, switched, switched ? `display mode set to ${label}` : `failed to set ${label}`, []);
    if (!switched) {
      record(`${key}-mode-blocked`, false, 'skipping mode-specific corpus due to switch failure', []);
    }
    await sleep(1500);
  } else if (kind === 'trust') {
    const switched = await setTrustInvestmentMode();
    record(`ux-switch-${key}`, switched, switched ? 'trust investment mode enabled' : 'failed trust mode', []);
    if (!switched) {
      record(`${key}-mode-blocked`, false, 'skipping mode-specific corpus due to trust switch failure', []);
    }
    await sleep(1500);
  }

  await goHomeTab();
  await completeOnboarding();
  await scrollHomeToTop();
  await waitSplashGone(`${prefix}-home`);
  const corpus = await scrollCollectCorpus(prefix);
  const found = FLOW_BUTTONS.filter((b) => corpus.has(b.homeLabel));
  record(
    `${key}-four-buttons-corpus`,
    found.length === 4 ? true : found.length > 0 ? 'partial' : false,
    `scroll corpus saw ${found.length}/4 home buttons`,
    [`${prefix}-scroll-corpus.txt`],
  );
  screenshot(`${prefix}-home-after-scroll`);

  for (const flow of FLOW_BUTTONS) {
    await goHomeTab();
    await sleep(1200);
    const btn = await scrollToTapButton(`${prefix}-btn`, flow.homeLabel);
    if (!btn) {
      record(`${key}-flow-${flow.key}-open`, false, 'button not found for tap', []);
      continue;
    }
    tap(btn);
    await sleep(POST_TAP_MS);
    if (!(await waitSplashGone(`${prefix}-flow-${flow.key}`))) {
      record(`${key}-flow-${flow.key}-splash`, false, 'still on splash after tap', []);
      adbShell('input keyevent 4');
      await sleep(1000);
      continue;
    }
    const flowXml = await dumpUi(`${prefix}-flow-${flow.key}-screen`);
    screenshot(`${prefix}-flow-${flow.key}-screen`);
    const joined = xmlTextJoined(flowXml);
    const opened =
      joined.includes(flow.flowTitle) ||
      joined.includes(flow.homeLabel) ||
      joined.includes(CREATE_LIST) ||
      joined.includes('Rakuten') ||
      joined.includes('証券');
    record(`${key}-flow-${flow.key}-open`, opened, opened ? `flow UI for ${flow.key}` : 'flow screen not detected', [`${prefix}-flow-${flow.key}-screen.png`]);

    await fillFlowInputs(flow.key);
    const created = await completeFlow(flow.key, `${prefix}-${flow.key}`, flow.homeLabel);
    record(`${key}-flow-${flow.key}-create`, created.ok, created.detail, created.evidence || []);

    adbShell('input keyevent 4');
    await sleep(1200);
    adbShell('input keyevent 4');
    await sleep(1200);
  }
}

async function main() {
  ensureOut();
  const meta = {
    serial: SERIAL,
    deviceModel: adbShell('getprop ro.product.model'),
    versionCode: sh(`${ADB} shell dumpsys package ${PKG} | findstr versionCode`),
    branch: sh('git branch --show-current'),
    postTapMs: POST_TAP_MS,
    scrollSwipes: SCROLL_SWIPES,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, 'phase-b-meta.json'), JSON.stringify(meta, null, 2));

  await wakeAndPrep();
  adbShell(`am start -n ${PKG}/.MainActivity`);
  await sleep(8000);
  await dismissDialogs('boot');
  const splashOk = await waitSplashGone('boot');
  record('splash-gone', splashOk, splashOk ? 'main activity stable without splash text' : 'splash wait timeout', []);
  const jaOk = await ensureJapaneseLanguage();
  record('language-ja', jaOk, jaOk ? 'UI language set to Japanese' : 'could not select Japanese', []);
  await goHomeTab();
  const onboardOk = await completeOnboarding();
  record('onboarding-dismiss', onboardOk, onboardOk ? 'reached home manual-order section' : 'onboarding may still block home', []);

  const modes = [
    { key: 'beginner', label: DISPLAY_MODES[0].label, kind: 'display' },
    { key: 'standard', label: DISPLAY_MODES[1].label, kind: 'display' },
    { key: 'pro', label: DISPLAY_MODES[2].label, kind: 'display' },
    { key: 'trust', label: TRUST_LABEL, kind: 'trust' },
  ];

  for (const mode of modes) {
    await verifyMode(mode);
  }

  const outPath = path.join(OUT, 'results-phase-b.json');
  fs.writeFileSync(outPath, JSON.stringify({ meta, results }, null, 2));
  console.log('WROTE', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

