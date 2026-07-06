#!/usr/bin/env node
process.env.PYTHONIOENCODING = 'utf-8';

import { setTimeout as sleep } from 'node:timers/promises';
import {
  initContext,
  prepareDevice,
  buildMeta,
  createRecorder,
  saveResults,
  resultPath,
  FLOWS,
  CREATE,
  VIEW_LIST,
  OK_BTN,
  POST_TAP_MS,
  findTestId,
  texts,
  find,
  tap,
  dump,
  shot,
  dismissSystemChrome,
  ensureHomeReady,
  returnToHome,
  tapHomeFlowButton,
  readPendingCountMandatory,
  waitForCreateReady,
  fillFlow,
  tapCreate,
  saveFailureArtifacts,
  currentActivity,
} from './_deviceVerifyE2eCommon.mjs';

const ctx = initContext();
const results = [];
const record = createRecorder(results);
const RESULT_FILE = resultPath('c');

function flowOpened(xml, flow) {
  return (
    findTestId(xml, `manual-order-flow-${flow.key}`) ||
    findTestId(xml, `manual-order-create-${flow.key}`) ||
    [...texts(xml)].some((t) => t === flow.title || t === CREATE)
  );
}

async function main() {
  await prepareDevice(ctx);
  await dismissSystemChrome(ctx);
  await sleep(1500);
  record(
    'test-c-app-mode',
    'PASS',
    'practice mode allowed — manual order list is Rakuten hand-entry only (no live analysis required)',
    [],
  );

  const ready = await ensureHomeReady(ctx, 'test-c-prep');
  if (!ready) {
    record('test-c-prerequisite', 'FAIL', 'home 4 buttons not ready', await saveFailureArtifacts('test-c-prep', 'home not ready'));
    saveResults(RESULT_FILE, { meta: buildMeta(), results });
    return;
  }
  record('test-c-prerequisite', 'PASS', '4 home buttons visible (practice OK)', []);

  const baseline = await readPendingCountMandatory(ctx, 'test-c-baseline');
  if (baseline.count == null) {
    record('test-c-pending-baseline', 'FAIL', 'baseline pending unavailable (ui+storage)', await saveFailureArtifacts('test-c-baseline', 'no pending probe'));
    saveResults(RESULT_FILE, { meta: buildMeta(), results });
    return;
  }
  let pending = baseline.count;
  record('test-c-pending-baseline', 'PASS', `before=${pending} (${baseline.source})`, []);

  for (const flow of FLOWS) {
    const tag = `test-c-${flow.key}`;
    const open = await tapHomeFlowButton(ctx, flow.key, tag);
    if (!open.ok) {
      record(`test-c-flow-${flow.key}-open`, 'FAIL', `button not found activity=${currentActivity()}`, open.evidence || []);
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'open failed', open.evidence || []);
      await returnToHome(ctx);
      continue;
    }
    await sleep(POST_TAP_MS);
    const fx = await dump(ctx, `${tag}-screen`);
    shot(`${tag}-screen`);
    const opened = flowOpened(fx, flow);
    record(`test-c-flow-${flow.key}-open`, opened ? 'PASS' : 'FAIL', opened ? flow.title : `not open activity=${currentActivity()}`, [`${tag}-screen.png`]);

    if (!opened) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'flow screen not verified', await saveFailureArtifacts(`${tag}-open-fail`, 'flow title missing'));
      await returnToHome(ctx);
      continue;
    }

    const readyCreate = await waitForCreateReady(ctx, flow.key, tag, record);
    if (!readyCreate.ok) {
      const evidence = await saveFailureArtifacts(`${tag}-blocked`, readyCreate.reason || 'create blocked');
      record(`test-c-create-ready-${flow.key}`, 'FAIL', `blocked: ${readyCreate.reason}`, evidence);
      record(`test-c-e2e-${flow.key}`, 'FAIL', `create blocked: ${readyCreate.reason}`, evidence);
      await returnToHome(ctx);
      continue;
    }
    record(`test-c-create-ready-${flow.key}`, 'PASS', 'manual-order-create-ready:yes', []);

    await fillFlow(ctx, flow.key);
    const before = pending;
    if (!(await tapCreate(ctx, tag, flow.key))) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'create button not tappable', await saveFailureArtifacts(`${tag}-create`, 'create tap failed'));
      await returnToHome(ctx);
      continue;
    }
    await sleep(5000);
    const ax = await dump(ctx, `${tag}-alert`);
    shot(`${tag}-alert`);
    const view = find(ax, (t) => t === VIEW_LIST || t.includes('\u30ea\u30b9\u30c8'));
    if (view[0]) {
      tap(view[0]);
      await sleep(POST_TAP_MS);
    } else {
      const okBtn = find(ax, (t) => t === OK_BTN || t === 'OK');
      if (okBtn[0]) tap(okBtn[0]);
      await sleep(1500);
    }

    const afterProbe = await readPendingCountMandatory(ctx, `${tag}-list`);
    shot(`${tag}-list`);
    if (afterProbe.count == null) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', `pending unreadable after create (was ${before})`, await saveFailureArtifacts(`${tag}-pending`, 'pending probe missing'));
    } else if (afterProbe.count > before) {
      record(`test-c-e2e-${flow.key}`, 'PASS', `pending ${before} -> ${afterProbe.count} (${afterProbe.source})`, [`${tag}-list.png`]);
      pending = afterProbe.count;
    } else {
      record(`test-c-e2e-${flow.key}`, 'FAIL', `pending not increased ${before} -> ${afterProbe.count} (${afterProbe.source})`, [`${tag}-list.png`]);
    }
    await returnToHome(ctx);
    await ensureHomeReady(ctx, `${tag}-post`);
  }

  saveResults(RESULT_FILE, { meta: buildMeta(), results });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
