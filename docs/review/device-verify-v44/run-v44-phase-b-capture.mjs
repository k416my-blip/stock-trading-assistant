import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SERIAL = process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${SERIAL}`;
const OUT = path.join('docs', 'review', 'device-verify-v44');
const ja = JSON.parse(fs.readFileSync('src/i18n/resources/ja/home.json', 'utf8'));
const flows = [
  ['concierge_full', ja.manualOrderEntry.conciergeFull.title, ja.manualOrderFlow.conciergeFull.title],
  ['manual_full', ja.manualOrderEntry.manualFull.title, ja.manualOrderFlow.manualFull.title],
  ['concierge_symbol', ja.manualOrderEntry.conciergeSymbol.title, ja.manualOrderFlow.conciergeSymbol.title],
  ['concierge_quantity', ja.manualOrderEntry.conciergeQuantity.title, ja.manualOrderFlow.conciergeQuantity.title],
];
const section = ja.manualOrderEntry.sectionTitle;
const skip = ja.onboarding.skip;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
function adb(args) { return sh(`${ADB} shell ${args}`); }
async function dump(name) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < 5; i++) {
    try {
      adb('uiautomator dump /sdcard/cap.xml');
      sh(`${ADB} exec-out cat /sdcard/cap.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, 'utf8');
      if (xml.includes('<hierarchy')) return xml;
    } catch {}
    await sleep(1500);
  }
  return '';
}
function shot(name) { sh(`${ADB} exec-out screencap -p > "${path.join(OUT, `${name}.png`)}"`); }
function find(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"/g;
  const bRe = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    const b = xml.slice(m.index, m.index + 500).match(bRe);
    if (!b || !pred(label)) continue;
    out.push({ label, cx: (~~b[1] + ~~b[3]) >> 1, cy: (~~b[2] + ~~b[4]) >> 1 });
  }
  return out;
}
function tap(n) { adb(`input tap ${n.cx} ${n.cy}`); }

const corpus = new Set();
adb('input tap 101 2486');
await sleep(2000);
for (let i = 0; i < 6; i++) {
  const xml = await dump(`cap-onboard-${i}`);
  if ([...find(xml, () => true).map((x) => x.label), ...xml.matchAll(/text="([^"]*)"/g)].some((x) => (x[1] || x) === section)) break;
  const s = find(xml, (l) => l === skip)[0];
  if (s) tap(s);
  await sleep(1200);
}
for (let i = 0; i < 28; i++) {
  const xml = await dump(`cap-scroll-${i}`);
  for (const m of xml.matchAll(/(?:text|content-desc)="([^"]*)"/g)) if (m[1]) corpus.add(m[1]);
  adb('input swipe 540 1900 540 600 350');
  await sleep(500);
}
fs.writeFileSync(path.join(OUT, 'phase-b-capture-scroll-corpus.txt'), [...corpus].sort().join('\n'), 'utf8');
shot('phase-b-four-buttons-corpus');

const results = [];
const seen = flows.filter((f) => corpus.has(f[1]));
results.push({ id: 'four-buttons', status: seen.length === 4 ? 'PASS' : seen.length ? 'PARTIAL' : 'FAIL', detail: `${seen.length}/4 in scroll corpus`, evidence: ['phase-b-capture-scroll-corpus.txt', 'phase-b-four-buttons-corpus.png'] });

for (const [key, homeLabel, flowTitle] of flows) {
  adb('input tap 101 2486');
  await sleep(1500);
  let tapped = false;
  for (let i = 0; i < 28; i++) {
    const xml = await dump(`cap-find-${key}-${i}`);
    const btn = find(xml, (l) => l === homeLabel)[0];
    if (btn) {
      shot(`phase-b-btn-${key}-home`);
      tap(btn);
      tapped = true;
      break;
    }
    adb('input swipe 540 1900 540 600 350');
    await sleep(450);
  }
  await sleep(12000);
  const fx = await dump(`cap-flow-${key}`);
  shot(`phase-b-flow-${key}-screen`);
  const open = fx.includes(flowTitle) || fx.includes(homeLabel) || fx.includes(ja.manualOrderFlow.createList);
  results.push({ id: `flow-${key}`, status: open ? 'PASS' : 'FAIL', detail: open ? `opened ${flowTitle}` : 'flow not detected', evidence: [`phase-b-btn-${key}-home.png`, `phase-b-flow-${key}-screen.png`] });
  adb('input keyevent 4');
  await sleep(1200);
}

const meta = { serial: SERIAL, versionCode: sh(`${ADB} shell dumpsys package com.assistant.stocktrading`).match(/versionCode=\d+/)?.[0], timestamp: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, 'results-phase-b.json'), JSON.stringify({ meta, results }, null, 2));
for (const r of results) console.log(r.status, r.id, r.detail);
