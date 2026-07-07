#!/usr/bin/env node
/** Lightweight device smoke — one ManualOrderList action per run (OOM-safe). */
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
  find,
  tap,
  dismissOnboarding,
  dismissSystemChrome,
  openManualOrderList,
  adb,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';
import { findTestId, parseListProbesFromXml } from './_deviceVerifyAdb.mjs';
import { checkE2eMemoryGate, logMemorySnapshot } from './_deviceVerifyMemory.mjs';

const ACTION = process.argv[2] || process.env.MOL_SMOKE_ACTION || 'delete-one';
const OUT = path.join('docs', 'review', 'manual-order-list-smoke');
const RESULT = path.join(OUT, `${ACTION}-result.json`);

const DIALOG = {
  deleteOneTitle: 'この手動注文を削除しますか？',
  deleteOneBody: '削除すると元に戻せません',
  deleteAllTitle: '未完了の手動注文をすべて削除しますか？',
  markCompleteTitle: 'この注文を実行済みにしますか？',
};

function firstTestIdPrefix(xml, prefix) {
  return [...texts(xml)].find((t) => t.startsWith(prefix));
}

function findActionTarget(xml, { testIdPrefix, label }) {
  const testId = firstTestIdPrefix(xml, testIdPrefix);
  if (testId) {
    const hit = findTestId(xml, testId);
    if (hit) return { kind: 'testId', id: testId, hit };
  }
  const byLabel = find(xml, (t) => t === label)[0];
  if (byLabel) return { kind: 'label', id: label, hit: byLabel };
  return null;
}

async function readProbes(ctx, tag, { scrollForActions = false } = {}) {
  let xml = await dump(ctx, tag);
  let probes = parseListProbesFromXml(xml);
  if (scrollForActions && !firstTestIdPrefix(xml, 'manual-order-delete-')) {
    for (let i = 0; i < 6; i++) {
      adb('input swipe 540 1800 540 900 280');
      await sleep(500);
      xml = await dump(ctx, `${tag}-scroll-${i}`);
      probes = parseListProbesFromXml(xml);
      if (firstTestIdPrefix(xml, 'manual-order-delete-')) break;
    }
  }
  return { ...probes, xml };
}

async function tapConfirmOk({ titleHint } = {}) {
  for (let i = 0; i < 8; i++) {
    await sleep(i === 0 ? 700 : 350);
    const xml = await dump({}, `mol-confirm-${i}`);
    const joined = [...texts(xml)].join('\n');
    const titleOk = !titleHint || joined.includes(titleHint);
    const okBtn = findTestId(xml, 'manual-order-confirm-ok');
    if (titleOk && okBtn) {
      tap(okBtn);
      return {
        tapped: 'manual-order-confirm-ok',
        dialogText: joined.slice(0, 900),
        titleVisible: titleOk,
        bodyVisible: joined.includes('manual-order-confirm-body'),
      };
    }
  }
  return { tapped: 'missing', dialogText: '', titleVisible: false, bodyVisible: false };
}

async function dismissDevOverlays(ctx) {
  for (let i = 0; i < 5; i++) {
    const xml = await dump(ctx, `dev-${i}`);
    const joined = [...texts(xml)].join(' ');
    if (joined.includes('RELOAD') || joined.includes('Unable to load script')) {
      adb('input keyevent 4');
      await sleep(500);
      adb(`am force-stop ${PKG}`);
      await sleep(1500);
      adb(`am start -n ${PKG}/.MainActivity`);
      await sleep(10000);
      continue;
    }
    return;
  }
}

async function ensureListOpen(ctx, report) {
  const t0 = Date.now();
  const opened = await openManualOrderList(ctx, 'mol', { timeoutMs: 50000 });
  report.listOpenMs = Date.now() - t0;
  report.listOpened = opened;
  if (!opened) {
    report.fail = 'list-not-opened';
    report.overall = 'FAIL';
    return false;
  }
  return true;
}

async function smokeDeleteOne(ctx, report) {
  const before = await readProbes(ctx, 'mol-before', { scrollForActions: true });
  report.pendingBefore = before.pending;
  report.completedBefore = before.completed;

  const target = findActionTarget(before.xml, { testIdPrefix: 'manual-order-delete-', label: '削除' });
  if (!target) {
    report.fail = 'no-delete-button';
    report.overall = 'FAIL';
    return;
  }
  report.targetTestId = target.id;
  report.targetKind = target.kind;
  tap(target.hit);

  const alert = await tapConfirmOk({ titleHint: DIALOG.deleteOneTitle });
  report.dialog = alert;
  report.dialogTitleOk = alert.titleVisible && alert.dialogText.includes(DIALOG.deleteOneTitle);
  report.dialogBodyOk = alert.bodyVisible || alert.dialogText.includes(DIALOG.deleteOneBody);

  await sleep(1500);
  const after = await readProbes(ctx, 'mol-after', { scrollForActions: true });
  report.pendingAfter = after.pending;
  report.completedAfter = after.completed;

  const pendingDelta =
    report.pendingBefore != null && report.pendingAfter != null
      ? report.pendingAfter - report.pendingBefore
      : null;
  report.pendingDelta = pendingDelta;
  report.overall =
    pendingDelta === -1 && report.dialogTitleOk ? 'PASS' : pendingDelta === -1 ? 'PARTIAL' : 'FAIL';
}

async function smokeCompleteOne(ctx, report) {
  const before = await readProbes(ctx, 'mol-before', { scrollForActions: true });
  report.pendingBefore = before.pending;
  report.completedBefore = before.completed;

  const target = findActionTarget(before.xml, { testIdPrefix: 'manual-order-complete-', label: '実行済みにする' });
  if (!target) {
    report.fail = 'no-complete-button';
    report.overall = 'FAIL';
    return;
  }
  report.targetTestId = target.id;
  report.targetKind = target.kind;
  tap(target.hit);

  const alert = await tapConfirmOk({ titleHint: DIALOG.markCompleteTitle });
  report.dialog = alert;
  report.dialogTitleOk = alert.titleVisible && alert.dialogText.includes(DIALOG.markCompleteTitle);

  await sleep(1500);
  const after = await readProbes(ctx, 'mol-after', { scrollForActions: true });
  report.pendingAfter = after.pending;
  report.completedAfter = after.completed;

  const pendingDelta =
    report.pendingBefore != null && report.pendingAfter != null
      ? report.pendingAfter - report.pendingBefore
      : null;
  const completedDelta =
    report.completedBefore != null && report.completedAfter != null
      ? report.completedAfter - report.completedBefore
      : null;
  report.pendingDelta = pendingDelta;
  report.completedDelta = completedDelta;
  report.overall =
    pendingDelta === -1 && completedDelta === 1 && report.dialogTitleOk
      ? 'PASS'
      : pendingDelta === -1 && completedDelta === 1
        ? 'PARTIAL'
        : 'FAIL';
}

async function smokeEditOne(ctx, report) {
  const before = await readProbes(ctx, 'mol-before', { scrollForActions: true });
  report.pendingBefore = before.pending;
  report.completedBefore = before.completed;

  const target = findActionTarget(before.xml, { testIdPrefix: 'manual-order-edit-', label: '編集' });
  if (!target) {
    report.fail = 'no-edit-button';
    report.overall = 'FAIL';
    return;
  }
  report.targetTestId = target.id;
  report.targetKind = target.kind;
  tap(target.hit);
  await sleep(1500);

  let editXml = await dump(ctx, 'mol-edit-open');
  for (let i = 0; i < 5; i++) {
    if (findTestId(editXml, 'manual-order-edit-save')) break;
    adb('input swipe 540 2100 540 1300 300');
    await sleep(450);
    editXml = await dump(ctx, `mol-edit-scroll-${i}`);
  }

  const sharesField = findTestId(editXml, 'manual-order-edit-shares');
  if (sharesField) tap(sharesField);
  await sleep(500);
  for (let i = 0; i < 10; i++) adb('input keyevent 67');
  adb('input text 999');
  await sleep(600);

  editXml = await dump(ctx, 'mol-edit-save');
  let saveHit = findTestId(editXml, 'manual-order-edit-save');
  if (!saveHit) {
    adb('input swipe 540 2100 540 1300 300');
    await sleep(450);
    editXml = await dump(ctx, 'mol-edit-save2');
    saveHit = findTestId(editXml, 'manual-order-edit-save');
  }
  report.saveTapped = saveHit ? 'manual-order-edit-save' : 'save-fallback';
  if (saveHit) tap(saveHit);
  else tap({ cx: 900, cy: 2350, label: 'save-fallback' });

  await sleep(1500);
  adb('input keyevent 4');
  await sleep(400);
  await openManualOrderList(ctx, 'mol-reopen');
  const after = await readProbes(ctx, 'mol-after', { scrollForActions: true });
  report.pendingAfter = after.pending;
  report.completedAfter = after.completed;
  report.pendingDelta =
    report.pendingBefore != null && report.pendingAfter != null
      ? report.pendingAfter - report.pendingBefore
      : null;

  const listText = [...texts(after.xml)].join('\n');
  report.editReflected = listText.includes('999');
  report.overall =
    report.pendingDelta === 0 && report.editReflected ? 'PASS' : report.editReflected ? 'PARTIAL' : 'FAIL';
}

async function smokeBulkDelete(ctx, report) {
  const before = await readProbes(ctx, 'mol-before', { scrollForActions: true });
  report.pendingBefore = before.pending;
  report.completedBefore = before.completed;

  if (before.pending === 0) {
    report.skip = 'no-pending';
    report.overall = 'PARTIAL';
    return;
  }

  const bulk =
    findTestId(before.xml, 'manual-order-bulk-delete-pending') ??
    find(before.xml, (t) => t === '未完了をすべて削除')[0];
  if (!bulk) {
    report.fail = 'no-bulk-delete-button';
    report.overall = 'FAIL';
    return;
  }
  tap(bulk);

  const alert = await tapConfirmOk({ titleHint: DIALOG.deleteAllTitle });
  report.dialog = alert;
  report.dialogTitleOk = alert.titleVisible && alert.dialogText.includes(DIALOG.deleteAllTitle);

  await sleep(1500);
  const after = await readProbes(ctx, 'mol-after', { scrollForActions: true });
  report.pendingAfter = after.pending;
  report.completedAfter = after.completed;
  report.overall = after.pending === 0 && report.dialogTitleOk ? 'PASS' : after.pending === 0 ? 'PARTIAL' : 'FAIL';
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const gate = checkE2eMemoryGate();
  const report = {
    overall: 'FAIL',
    action: ACTION,
    gate,
    meta: null,
    pendingBefore: null,
    pendingAfter: null,
    completedBefore: null,
    completedAfter: null,
    startedAt: new Date().toISOString(),
  };

  if (!gate.ok) {
    report.fail = 'memory-gate';
    fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
    process.exit(3);
  }

  logMemorySnapshot('before');
  initContext();
  await prepareDevice({});
  await dismissSystemChrome({});
  await dismissOnboarding({});

  await dismissDevOverlays({});

  if (!(await ensureListOpen({}, report))) {
    fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
    console.log('MOL-SMOKE', JSON.stringify(report));
    process.exit(1);
  }

  report.meta = buildMeta();

  switch (ACTION) {
    case 'delete-one':
      await smokeDeleteOne({}, report);
      break;
    case 'complete-one':
      await smokeCompleteOne({}, report);
      break;
    case 'edit-one':
      await smokeEditOne({}, report);
      break;
    case 'bulk-delete':
      await smokeBulkDelete({}, report);
      break;
    default:
      report.fail = `unknown-action-${ACTION}`;
      report.overall = 'FAIL';
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT, JSON.stringify(report, null, 2));
  console.log('MOL-SMOKE', JSON.stringify({ action: ACTION, overall: report.overall, pending: `${report.pendingBefore}->${report.pendingAfter}`, completed: `${report.completedBefore}->${report.completedAfter}` }));
  logMemorySnapshot('after');
  process.exitCode = report.overall === 'FAIL' ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  logMemorySnapshot('error');
  process.exit(1);
});
