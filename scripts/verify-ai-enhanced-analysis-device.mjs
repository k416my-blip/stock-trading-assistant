/**
 * AI分析強化 — 実機検証
 * node scripts/verify-ai-enhanced-analysis-device.mjs
 *
 * 前提: adb 実機接続 · Expo/Metro で最新バンドル起動済み
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PKG = 'com.assistant.stocktrading';
const OUT_DIR = path.join('scripts', 'ai-enhanced-analysis-device-verify');
const QUESTION = '1155 Maybank は買い？';
const QUESTION_ADB = '1155%20Maybank';
const MISSING_DATA_QUESTION = 'hello';

const REQUIRED_LABELS = [
  { id: 'stockName', patterns: ['1. 銘柄名', '銘柄名:'] },
  { id: 'currentPrice', patterns: ['2. 現在株価', '現在株価:'] },
  { id: 'shares', patterns: ['3. 保有株数', '保有株数:'] },
  { id: 'marketValue', patterns: ['4. 評価額', '評価額:'] },
  { id: 'unrealizedPnl', patterns: ['5. 含み損益', '含み損益:'] },
  { id: 'judgment', patterns: ['6. 総合判定', '総合判定:'] },
  { id: 'confidence', patterns: ['7. 確信度', '確信度:'] },
  { id: 'reasons', patterns: ['8. 判断理由', '判断理由'] },
  { id: 'positive', patterns: ['9. ポジティブ材料', 'ポジティブ材料'] },
  { id: 'negative', patterns: ['10. ネガティブ材料', 'ネガティブ材料'] },
  { id: 'risk', patterns: ['11. リスク', 'リスク'] },
  { id: 'nextCheck', patterns: ['12. 次に確認すべきポイント', '次に確認すべきポイント'] },
  { id: 'action', patterns: ['13. AI推奨アクション', 'AI推奨アクション'] },
  { id: 'sourceScores', patterns: ['14. ソース別スコア', 'ソース別スコア'] },
  { id: 'overallScore', patterns: ['15. 総合スコア', '総合スコア'] },
];

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function adbOk() {
  const out = sh('adb devices');
  return out.split('\n').filter((l) => l.includes('\tdevice')).length > 0;
}

function dumpUi(name) {
  const dest = path.join(OUT_DIR, `${name}.xml`);
  sh('adb shell uiautomator dump /sdcard/ui-ai-enhanced.xml');
  sh(`adb shell cat /sdcard/ui-ai-enhanced.xml > "${dest}"`);
  return fs.readFileSync(dest, 'utf8');
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
  console.log('tap', item.label.slice(0, 60), item.cx, item.cy);
  sh(`adb shell input tap ${item.cx} ${item.cy}`);
}

function scrollUp() {
  sh('adb shell input swipe 540 900 540 2100 350');
}

function scrollDown() {
  sh('adb shell input swipe 540 2100 540 700 350');
}

function screenshot(name) {
  const remote = `/sdcard/sta-ai-enhanced-${name}.png`;
  const local = path.join(OUT_DIR, `${name}.png`);
  sh(`adb shell screencap -p ${remote}`);
  sh(`adb pull ${remote} "${local}"`);
  console.log('screenshot', local);
  return local;
}

function collectAllText(xml) {
  const re = /(?:text|content-desc)="([^"]*)"/g;
  const texts = [];
  let m;
  while ((m = re.exec(xml))) {
    if (m[1]?.trim()) texts.push(m[1]);
  }
  return texts.join('\n');
}

function checkRequiredLabels(combinedXml) {
  const results = {};
  let pass = 0;
  for (const item of REQUIRED_LABELS) {
    const found = item.patterns.some((p) => combinedXml.includes(p));
    results[item.id] = found;
    if (found) pass += 1;
  }
  return { results, pass, total: REQUIRED_LABELS.length };
}

async function dismissDialogs() {
  for (let i = 0; i < 4; i++) {
    const xml = dumpUi(`dismiss-${i}`);
    const btn = findLabels(xml, (l) => ['スキップ', '閉じる', 'OK', '後で'].includes(l));
    if (!btn[0]) break;
    tap(btn[0]);
    await sleep(1200);
  }
}

async function openConcierge() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(800);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(14000);
  await dismissDialogs();

  let xml = dumpUi('01-home');
  screenshot('01-home');

  const fabCandidates = findLabels(
    xml,
    (l) => l === 'AI' || l.includes('AIコンシェルジュを開く'),
  );
  const fab = fabCandidates.sort((a, b) => b.cy - a.cy)[0];
  if (fab) {
    tap(fab);
  } else {
    console.log('tap default FAB area (bottom-right)');
    sh('adb shell input tap 980 2280');
  }
  await sleep(5000);

  xml = dumpUi('02-concierge-open');
  if (!xml.includes('AIコンシェルジュ') && !xml.includes('分析モード')) {
    console.log('retry FAB tap');
    sh('adb shell input tap 980 2280');
    await sleep(4000);
    xml = dumpUi('02-concierge-open-retry');
  }
  screenshot('02-concierge-open');
  return xml;
}

async function sendQuestion(questionText, questionAdb) {
  let xml = dumpUi('03-before-send');

  const sendBtn = findLabels(xml, (l) => l === '送信');
  if (sendBtn.length) {
    const btn = sendBtn.sort((a, b) => b.cy - a.cy)[0];
    sh(`adb shell input tap ${btn.cx - 260} ${btn.cy}`);
  } else {
    const placeholder = findLabels(xml, (l) => l.includes('1155') || l.includes('方針を入力'));
    if (placeholder[0]) tap(placeholder[0]);
    else sh('adb shell input tap 480 380');
  }
  await sleep(800);

  for (let i = 0; i < 40; i++) sh('adb shell input keyevent 67');
  sh(`adb shell input text ${questionAdb}`);
  await sleep(800);
  screenshot('03-question-typed');

  xml = dumpUi('04-before-submit');
  const sendAfter = findLabels(xml, (l) => l === '送信');
  if (sendAfter.length) {
    tap(sendAfter.sort((a, b) => b.cy - a.cy)[0]);
  } else {
    sh('adb shell input keyevent 66');
  }
  console.log('sent question:', questionText);
  await sleep(3000);
}

async function waitForAnalysisBlock(maxWaitMs = 150000) {
  const start = Date.now();
  let combined = '';
  while (Date.now() - start < maxWaitMs) {
    for (let i = 0; i < 10; i++) {
      scrollDown();
      await sleep(350);
    }
    for (let i = 0; i < 10; i++) {
      const xml = dumpUi(`05-scroll-${i}-${Date.now()}`);
      combined += '\n' + collectAllText(xml);
      if (
        xml.includes('AI分析結果') ||
        xml.includes('1. 銘柄名') ||
        xml.includes('concierge-enhanced-analysis')
      ) {
        screenshot('04-ai-analysis-result');
        return { xml, combined, found: true };
      }
      scrollUp();
      await sleep(300);
    }
    console.log('waiting for AI response...', Math.round((Date.now() - start) / 1000), 's');
    await sleep(6000);
  }
  const xml = dumpUi('05-timeout');
  combined += '\n' + collectAllText(xml);
  screenshot('04-ai-analysis-result');
  return { xml, combined, found: false };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!adbOk()) {
    console.error('FAIL: adb device not found');
    process.exit(2);
  }

  try {
    sh('adb reverse tcp:8081 tcp:8081');
    console.log('adb reverse tcp:8081 OK');
  } catch {
    console.warn('adb reverse failed — USB/Wi-Fi Metro 接続を確認');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    question: QUESTION,
    overall: 'FAIL',
    checks: {},
    missingDataTest: { crashed: false, pass: false },
    screenshots: [],
  };

  try {
    await openConcierge();
    await sendQuestion(QUESTION, QUESTION_ADB);

    const { combined, found } = await waitForAnalysisBlock();
    screenshot('04-ai-analysis-result');

    const labelCheck = checkRequiredLabels(combined);
    report.checks = {
      blockFound: found || combined.includes('AI分析結果'),
      labels: labelCheck.results,
      labelsPass: labelCheck.pass,
      labelsTotal: labelCheck.total,
      hasMaybank: /1155|Maybank|マレー/i.test(combined),
      noCrash: true,
    };
    report.screenshots.push('04-ai-analysis-result.png');

    console.log('\n=== 1155 Maybank 15項目チェック ===');
    for (const item of REQUIRED_LABELS) {
      const ok = labelCheck.results[item.id];
      console.log(`${ok ? '✓' : '✗'} ${item.id}`);
    }
    console.log(`\n表示: ${labelCheck.pass}/${labelCheck.total}`);

    await sendQuestion(MISSING_DATA_QUESTION, 'hello');
    await sleep(15000);
    const missingXml = dumpUi('06-missing-data');
    screenshot('05-missing-data-no-crash');
    const appRunning = !missingXml.includes('Unfortunately') && !missingXml.includes('クラッシュ');
    report.missingDataTest = {
      crashed: !appRunning,
      pass: appRunning,
    };
    report.screenshots.push('05-missing-data-no-crash.png');

    const allLabelsPass = labelCheck.pass === labelCheck.total;
    const blockOk = report.checks.blockFound;
    const noCrash = report.missingDataTest.pass && report.checks.noCrash;
    report.overall = allLabelsPass && blockOk && noCrash ? 'PASS' : 'FAIL';

    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('\n=== 結果 ===');
    console.log('総合:', report.overall);
    console.log('15項目:', `${labelCheck.pass}/${labelCheck.total}`);
    console.log('データ欠損クラッシュなし:', noCrash ? 'OK' : 'NG');
    console.log('レポート:', path.join(OUT_DIR, 'report.json'));

    process.exit(report.overall === 'PASS' ? 0 : 1);
  } catch (e) {
    report.overall = 'FAIL';
    report.error = e instanceof Error ? e.message : String(e);
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    screenshot('error-state');
    console.error('FAIL:', e);
    process.exit(1);
  }
}

main();
