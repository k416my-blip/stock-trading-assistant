import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const SERIAL = process.env.ADB_SERIAL || "FYRWXSNNAIOR9DCM";
const ADB = `adb -s ${SERIAL}`;
const OUT = path.join("docs", "review", "device-verify-v44");
const PKG = "com.assistant.stocktrading";
const POST_TAP_MS = Number(process.env.POST_TAP_MS || 15000);
const SCROLL_SWIPES = Number(process.env.SCROLL_SWIPES || 28);
const SPLASH_MARKERS = ["\u30a2\u30d7\u30ea\u3092\u8d77\u52d5", "Loading", "loading", "Splash"];

const ja = JSON.parse(fs.readFileSync("src/i18n/resources/ja/home.json", "utf8"));
const jaSettings = JSON.parse(fs.readFileSync("src/i18n/resources/ja/settings.json", "utf8"));
const buttons = [
  ja.manualOrderEntry.conciergeFull.title,
  ja.manualOrderEntry.manualFull.title,
  ja.manualOrderEntry.conciergeSymbol.title,
  ja.manualOrderEntry.conciergeQuantity.title,
];
const MODE_LABELS = ["beginner", "standard", "pro"].map((m) => jaSettings.displayMode.modes[m].label);

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}
function adbShell(args) {
  return sh(`${ADB} shell ${args}`);
}

async function dump(name, retries = 5) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < retries; i++) {
    try {
      adbShell("uiautomator dump /sdcard/ui-v44.xml");
      sh(`${ADB} exec-out cat /sdcard/ui-v44.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, "utf8");
      if (xml.includes("<hierarchy") && xml.length > 200) return xml;
    } catch (_) {}
    await sleep(1500);
  }
  return "";
}

function screenshot(name) {
  sh(`${ADB} exec-out screencap -p > "${path.join(OUT, `${name}.png`)}"`);
}

function xmlTexts(xml) {
  const texts = new Set();
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml))) if (m[1]) texts.add(m[1]);
  return texts;
}

function find(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"/g;
  const boundsRe = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    const b = xml.slice(m.index, m.index + 600).match(boundsRe);
    if (!b || !pred(label)) continue;
    out.push({ label, cx: Math.floor((+b[1] + +b[3]) / 2), cy: Math.floor((+b[2] + +b[4]) / 2) });
  }
  return out;
}

function tap(item) {
  console.log("TAP", item.label.slice(0, 50));
  adbShell(`input tap ${item.cx} ${item.cy}`);
}

async function waitSplashGone(tag) {
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    const focused = sh(`${ADB} shell dumpsys window`);
    if (!(focused.includes("MainActivity") && focused.includes(PKG))) {
      stable = 0;
      await sleep(500);
      continue;
    }
    const xml = await dump(`${tag}-splash-${i}`, 2);
    if (!xml) { stable = 0; await sleep(500); continue; }
    const joined = [...xmlTexts(xml)].join("\n");
    if (!SPLASH_MARKERS.some((s) => joined.includes(s))) stable += 1; else stable = 0;
    if (stable >= 20) return true;
    await sleep(500);
  }
  return false;
}

async function scrollCorpus(prefix) {
  const corpus = new Set();
  for (let s = 0; s < SCROLL_SWIPES; s++) {
    const xml = await dump(`${prefix}-scroll-${s}`);
    if (xml) for (const t of xmlTexts(xml)) corpus.add(t);
    adbShell("input swipe 540 1900 540 600 350");
    await sleep(550);
  }
  fs.writeFileSync(path.join(OUT, `${prefix}-scroll-corpus.txt`), [...corpus].sort().join("\n"), "utf8");
  return corpus;
}

adbShell("input keyevent 224");
sh(`${ADB} reverse tcp:8081 tcp:8081`);
adbShell(`am start -n ${PKG}/.MainActivity`);
await sleep(8000);
await waitSplashGone("finish-boot");

let xml = "";
for (let i = 0; i < 6; i++) {
  xml = await dump(`supp-dismiss-${i}`);
  const b = find(xml, (l) => ["\u30b9\u30ad\u30c3\u30d7", "\u9589\u3058\u308b", "OK", "\u8a31\u53ef"].includes(l));
  if (!b[0]) break;
  tap(b[0]);
  await sleep(800);
}

const seen = await scrollCorpus("supp");
for (const b of buttons) if (seen.has(b)) seen.add(b);
const visible = buttons.filter((b) => seen.has(b));

const results = [{
  id: "3-four-buttons-visible",
  pass: visible.length === 4,
  detail: `visible ${visible.length}/4 after scroll corpus`,
  evidence: ["supp-scroll-corpus.txt"],
}];

for (const label of buttons) {
  let opened = false;
  for (let s = 0; s < SCROLL_SWIPES; s++) {
    xml = await dump(`supp-open-${label.slice(0, 4)}-${s}`);
    const btn = find(xml, (l) => l === label);
    if (btn[0]) {
      tap(btn[0]);
      await sleep(POST_TAP_MS);
      await waitSplashGone(`supp-flow-${label.slice(0, 4)}`);
      const fx = await dump(`supp-flow-${label.slice(0, 8)}`);
      screenshot(`supp-flow-${label.slice(0, 8)}`);
      opened = fx.includes(label) || fx.includes("Rakuten") || fx.includes(ja.manualOrderFlow.createList);
      const disc = fx.includes("Rakuten") || fx.includes(ja.manualOrderFlow.createList);
      results.push({ id: `flow-open-${label.slice(0, 10)}`, pass: opened, detail: opened ? "opened" : "missing", evidence: [`supp-flow-${label.slice(0, 8)}.png`] });
      results.push({ id: `flow-disc-${label.slice(0, 10)}`, pass: disc, detail: disc ? "flow UI ok" : "no disclaimer/create", evidence: [`supp-flow-${label.slice(0, 8)}.png`] });
      adbShell("input keyevent 4");
      await sleep(1200);
      break;
    }
    adbShell("input swipe 540 1900 540 600 350");
    await sleep(500);
  }
  if (!opened) results.push({ id: `flow-open-${label.slice(0, 10)}`, pass: false, detail: "button not tappable", evidence: [] });
}

fs.writeFileSync(path.join(OUT, "supplement-results.json"), JSON.stringify(results, null, 2));
for (const r of results) console.log(r.pass ? "PASS" : "FAIL", r.id, r.detail);

