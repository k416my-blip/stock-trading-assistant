#!/usr/bin/env node
/**
 * AIコンシェルジュ予算最適化 — フォローアップ実機UI smoke（シナリオ分離・seed優先）
 */
process.env.PYTHONIOENCODING = 'utf-8';
process.env.E2E_FAIL_ONLY_MEDIA = '1';
process.env.SKIP_PM_CLEAR = '1';
process.env.POST_TAP_MS = '4000';

import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { findTestId, xmlTexts } from './_deviceVerifyAdb.mjs';
import {
  initContext,
  prepareDevice,
  buildMeta,
  FLOWS,
  find,
  texts,
  dump,
  tap,
  dismissSystemChrome,
  tapTab,
  ensureMarketBursa,
  TIDS,
  adb,
  ADB,
  sh,
} from './_deviceVerifyE2eCommon.mjs';

const OUT = path.join('docs', 'review', 'concierge-optimization-followup-smoke');
const RESULT_FILE = path.join(OUT, 'result.json');
const jaConcierge = JSON.parse(fs.readFileSync('src/i18n/resources/ja/concierge.json', 'utf8'));
const jaSettings = JSON.parse(fs.readFileSync('src/i18n/resources/ja/settings.json', 'utf8'));

function mkdirOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function shot(name) {
  mkdirOut();
  const p = path.join(OUT, `${name}.png`);
  sh(`${ADB} exec-out screencap -p > "${p}"`);
  return p;
}

function parseBudget(xml) {
  const all = [...xmlTexts(xml)];
  const b = {
    cardFound: !!findTestId(xml, 'concierge-budget-summary'),
    allocationCardFound: !!findTestId(xml, 'allocation-budget-summary'),
    budgetMYR: null,
    proposedSpendMYR: null,
    remainingCashMYR: null,
    hasRemainingReason: false,
    hasRisk: false,
    formProbe: all.find((t) => t.startsWith('manual-order-form-state:')) ?? null,
  };
  for (const t of all) {
    let m = t.match(/指定額: RM(\d+)/);
    if (m) b.budgetMYR = Number(m[1]);
    m = t.match(/提案買付額: RM(\d+)/);
    if (m) b.proposedSpendMYR = Number(m[1]);
    m = t.match(/残現金: RM(\d+)/);
    if (m) b.remainingCashMYR = Number(m[1]);
    m = t.match(/指定額 RM(\d+) \/ 提案 RM(\d+) \/ 残現金 RM(\d+)/);
    if (m) {
      b.budgetMYR = Number(m[1]);
      b.proposedSpendMYR = Number(m[2]);
      b.remainingCashMYR = Number(m[3]);
    }
    if (t.includes('現金として残') || t.includes('現金余力')) b.hasRemainingReason = true;
    if (t.startsWith('リスク:')) b.hasRisk = true;
  }
  return b;
}

async function restartApp() {
  adb('am force-stop com.assistant.stocktrading');
  await sleep(1500);
  adb('am start -n com.assistant.stocktrading/.MainActivity');
  await sleep(10000);
}

async function goHomeAndScrollToFlow(ctx, flowKey, tag) {
  await tapTab(ctx, 'home');
  await sleep(1500);
  let xml = await dump(ctx, `${tag}-home`);
  let hit = findTestId(xml, TIDS.homeManualOrderButton(flowKey));
  for (let i = 0; i < 12 && !hit; i++) {
    adb('input swipe 540 1600 540 900 280');
    await sleep(350);
    xml = await dump(ctx, `${tag}-scroll-${i}`);
    hit = findTestId(xml, TIDS.homeManualOrderButton(flowKey));
  }
  if (!hit) return { ok: false, reason: 'flow-button-not-found' };
  tap(hit);
  await sleep(5000);
  return { ok: true };
}

async function tapSeed(testId) {
  let xml = await dump({}, 'seed-scan');
  let hit = findTestId(xml, testId);
  if (!hit) {
    adb('input swipe 540 1600 540 900 280');
    await sleep(400);
    xml = await dump({}, 'seed-scan2');
    hit = findTestId(xml, testId);
  }
  if (!hit) return false;
  tap(hit);
  await sleep(1500);
  return true;
}

async function scenario1155Rm5000(ctx) {
  await restartApp();
  const open = await goHomeAndScrollToFlow(ctx, 'concierge_quantity', '1155-rm5000');
  if (!open.ok) return { id: '1155_rm5000', pass: false, reason: open.reason };
  await ensureMarketBursa(ctx, '1155-rm5000');
  const seeded =
    (await tapSeed('manual-order-e2e-apply-seed-quantity-rm5000')) ||
    (await tapSeed('manual-order-e2e-apply-seed'));
  await sleep(2000);
  const xml = await dump(ctx, '1155-rm5000-final');
  const budget = parseBudget(xml);
  const pass =
    seeded &&
    budget.cardFound &&
    budget.budgetMYR != null &&
    budget.proposedSpendMYR != null &&
    budget.proposedSpendMYR < budget.budgetMYR * 0.98 &&
    (budget.remainingCashMYR ?? 0) > 0 &&
    budget.hasRemainingReason;
  return {
    id: '1155_rm5000',
    pass,
    seeded,
    budget,
    screenshot: shot('1155_rm5000'),
    formProbe: budget.formProbe,
  };
}

async function scenarioTodayEmpty(ctx) {
  await restartApp();
  await tapTab(ctx, 'home');
  await sleep(1000);
  let xml = await dump(ctx, 'concierge-tabs');
  const tabHit =
    findTestId(xml, 'concierge-tab-screen') ??
    find(xml, (t) => t.includes('AIコンシェルジュ') || t.includes('AI相談'))[0];
  if (tabHit) tap(tabHit);
  else adb('input tap 610 2541');
  await sleep(4000);
  for (let i = 0; i < 6; i++) {
    adb('input swipe 540 1400 540 500 280');
    await sleep(600);
  }
  if (!(await tapSeed('concierge-e2e-force-empty-proposals'))) {
    await tapSeed('concierge-today-proposals-empty');
  }
  await sleep(1500);
  xml = await dump(ctx, 'today-empty');
  const emptyCard = !!findTestId(xml, 'concierge-today-proposals-empty');
  const emptyText = [...texts(xml)].some(
    (t) => t === jaConcierge.todayProposalsEmpty || t.includes('優先提案はありません'),
  );
  return {
    id: 'today_proposals_empty',
    pass: emptyCard && emptyText,
    emptyCard,
    emptyText,
    screenshot: shot('today_proposals_empty'),
  };
}

async function scenarioQuantityOnly100(ctx) {
  await restartApp();
  const open = await goHomeAndScrollToFlow(ctx, 'concierge_symbol', 'qty-100');
  if (!open.ok) return { id: 'quantity_only_100', pass: false, reason: open.reason };
  await ensureMarketBursa(ctx, 'qty-100');
  await tapSeed('manual-order-e2e-apply-seed-shares-100');
  await sleep(2500);
  const xml = await dump(ctx, 'qty-100-final');
  const budget = parseBudget(xml);
  const probe = budget.formProbe ?? '';
  const pass =
    probe.includes('見送り') ||
    probe.includes('現金維持') ||
    probe.includes('validation=ok') ||
    (budget.cardFound &&
      budget.proposedSpendMYR != null &&
      budget.proposedSpendMYR < 100 * 15);
  return {
    id: 'quantity_only_100',
    pass,
    budget,
    formProbe: probe,
    screenshot: shot('quantity_only_100'),
  };
}

async function scenarioBeginnerAllocation(ctx) {
  await restartApp();
  await tapTab(ctx, 'settings');
  await sleep(2000);
  for (let i = 0; i < 8; i++) {
    adb('input swipe 540 1600 540 900 280');
    await sleep(400);
  }
  let xml = await dump(ctx, 'settings-ux');
  const beginnerHit =
    findTestId(xml, 'settings-ux-mode-beginner') ??
    find(xml, (t) => t === jaSettings.displayMode.modes.beginner.label || t.includes('初心者'))[0];
  if (beginnerHit) {
    tap(beginnerHit);
    await sleep(2000);
  }
  await tapTab(ctx, 'home');
  await sleep(2000);
  xml = await dump(ctx, 'home-beginner');
  const allocBtn = find(xml, (t) =>
    t.includes('入金額を入力') || t.includes('おすすめ配分') || t.includes('おすすめを見る'),
  );
  if (allocBtn[0]) {
    tap(allocBtn[0]);
    await sleep(3000);
  }
  xml = await dump(ctx, 'alloc-beginner');
  const genBtn = find(xml, (t) => t === 'おすすめを見る' || t.includes('おすすめ'));
  if (genBtn[0]) {
    tap(genBtn[0]);
    await sleep(10000);
  }
  xml = await dump(ctx, 'alloc-result');
  const budget = parseBudget(xml);
  const noBuy = [...texts(xml)].some(
    (t) => t.includes('買付推奨はありません') || t.includes('見送り') || t.includes('現金維持'),
  );
  const pass = budget.allocationCardFound || noBuy || budget.cardFound;
  return {
    id: 'beginner_strict_allocation',
    pass,
    budget,
    noBuyMessage: noBuy,
    screenshot: shot('beginner_allocation'),
  };
}

async function main() {
  mkdirOut();
  const report = {
    startedAt: new Date().toISOString(),
    environment: 'physical-device',
    deviceSerial: process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM',
    meta: null,
    scenarios: [],
    overall: 'FAIL',
    failures: [],
  };
  const ctx = initContext();
  try {
    report.meta = buildMeta();
    await prepareDevice(ctx);
    await dismissSystemChrome(ctx);
    await restartApp();

    const results = [
      await scenario1155Rm5000(ctx),
      await scenarioTodayEmpty(ctx),
      await scenarioQuantityOnly100(ctx),
      await scenarioBeginnerAllocation(ctx),
    ];
    report.scenarios = results;
    for (const r of results) {
      if (!r.pass) report.failures.push(r.id);
    }
    const allPass = results.every((r) => r.pass);
    report.overall = allPass ? 'PASS' : report.failures.length <= 1 ? 'PARTIAL' : 'FAIL';
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.log('FOLLOWUP SMOKE', report.overall, RESULT_FILE);
    process.exit(allPass ? 0 : 1);
  } catch (e) {
    report.failures.push(String(e?.message ?? e));
    report.overall = 'FAIL';
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.error(e);
    process.exit(1);
  }
}

main();
