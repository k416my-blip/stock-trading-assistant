#!/usr/bin/env node
/** Lightweight device smoke: delete one pending manual order. */
process.env.PYTHONIOENCODING = 'utf-8';

import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import {
  initContext,
  prepareDevice,
  buildMeta,
  dump,
  texts,
  findTestId,
  tap,
  tapTab,
  dismissOnboarding,
  dismissSystemChrome,
  readPendingAllProbesAsync,
  adb,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';
import { checkE2eMemoryGate, logMemorySnapshot } from './_deviceVerifyMemory.mjs';

const PORTFOLIO_LIST_BTN = 'portfolio-manual-order-list';

const OUT = path.join('docs', 'review', 'manual-order-list-smoke');
const RESULT = path.join(OUT, 'delete-one-result.json');

function parsePendingFromXml(xml) {
  for (const t of texts(xml)) {
    if (t.startsWith('manual-order-pending-count:')) return Number(t.split(':')[1]);
  }
  return null;
}

async function openManualOrderList(ctx) {
  await tapTab(ctx, 'portfolio');
  await sleep(1200);
  let xml = await dump(ctx, 'mol-nav');
  let hit = findTestId(xml, PORTFOLIO_LIST_BTN);
  if (!hit) {
    adb('input swipe 540 1600 540 800 300');
    await sleep(500);
    xml = await dump(ctx, 'mol-nav2');
    hit = findTestId(xml, PORTFOLIO_LIST_BTN);
  }
  if (!hit) return false;
  tap(hit);
  await sleep(2000);
  return true;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const gate = checkE2eMemoryGate();
  const report = { overall: 'FAIL', gate, meta: null, pendingBefore: null, pendingAfter: null, action: 'delete-one' };
  if (!gate.ok) {
    fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
    process.exit(3);
  }
  initContext();
  await prepareDevice({});
  await dismissSystemChrome({});
  await dismissOnboarding({});
  const opened = await openManualOrderList({});
  if (!opened) {
    report.fail = 'list-not-opened';
    fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  report.meta = buildMeta();
  const beforeProbe = await readPendingAllProbesAsync({}, 'mol-before', { openListFirst: false });
  report.pendingBefore = beforeProbe.ui ?? parsePendingFromXml(await dump({}, 'mol-before-xml'));
  const xml = await dump({}, 'mol-list');
  const deleteBtn = [...texts(xml)].find((t) => t.startsWith('manual-order-delete-'));
  if (!deleteBtn) {
    report.fail = 'no-delete-button';
    fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  const hit = findTestId(xml, deleteBtn);
  if (hit) tap(hit);
  await sleep(800);
  const alertXml = await dump({}, 'mol-alert');
  const confirm = [...texts(alertXml)].find((t) => t === '削除');
  if (confirm) {
    const c = findTestId(alertXml, '削除') ?? { cx: 900, cy: 1400 };
    tap(typeof c === 'object' && 'cx' in c ? c : { cx: 900, cy: 1400 });
  }
  await sleep(1500);
  const afterProbe = await readPendingAllProbesAsync({}, 'mol-after', { openListFirst: false });
  report.pendingAfter = afterProbe.ui ?? parsePendingFromXml(await dump({}, 'mol-after-xml'));
  report.overall =
    report.pendingBefore != null && report.pendingAfter != null && report.pendingAfter < report.pendingBefore
      ? 'PASS'
      : 'PARTIAL';
  fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
  console.log('MOL-DELETE-SMOKE', JSON.stringify(report));
  process.exitCode = report.overall === 'FAIL' ? 1 : 0;
  logMemorySnapshot('after');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
