#!/usr/bin/env node
/**
 * Single-flow Device Verify v44 E2E (OOM-safe).
 * Usage: node run-v44-e2e-flow.mjs concierge_full
 * Env: E2E_RUN_TAG=rerun5-flow-concierge_full SKIP_PM_CLEAR=1
 */
process.env.PYTHONIOENCODING = 'utf-8';
process.env.E2E_FAIL_ONLY_MEDIA = '1';

import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import {
  initContext,
  prepareDevice,
  buildMeta,
  createRecorder,
  saveResults,
  resultPath,
  OUT,
  FLOWS,
  CREATE,
  POST_TAP_MS,
  findTestId,
  texts,
  dump,
  dismissSystemChrome,
  ensureHomeReady,
  ensureHomeFlowStart,
  returnToHome,
  tapHomeFlowButtonWithRetry,
  readPendingCountMandatory,
  readPendingAllProbesAsync,
  readPendingFromStorage,
  readPendingFromAppState,
  readPendingAfterCreate,
  evaluatePendingAfterCreate,
  dismissPostCreateAlert,
  waitForCreateReady,
  fillFlow,
  tapCreate,
  writeE2eManualOrderFormSeed,
  waitForManualOrderFormState,
  waitForCreateOutcome,
  saveFailureArtifacts,
  currentActivity,
  adb,
} from './_deviceVerifyE2eCommon.mjs';
import { checkE2eMemoryGate, logMemorySnapshot, stopE2eNodeProcesses } from './_deviceVerifyMemory.mjs';

const flowKey = process.argv[2];
const flow = FLOWS.find((f) => f.key === flowKey);
if (!flow) {
  console.error('Usage: node run-v44-e2e-flow.mjs <concierge_full|manual_full|concierge_symbol|concierge_quantity>');
  process.exit(2);
}

const RUN_TAG = process.env.E2E_RUN_TAG || `flow-${flowKey}`;
process.env.E2E_RUN_TAG = RUN_TAG;
const RESULT_FILE = path.join(OUT, `results-${RUN_TAG}.json`);

const FLOWS_WITH_FORM_PROBE = new Set(['manual_full', 'concierge_symbol', 'concierge_quantity']);

const FORM_SEED_PAYLOAD = {
  manual_full: { symbol: '1155', shares: '100', market: 'bursa' },
  concierge_symbol: { deposit: '2000', market: 'bursa', inputMode: 'amount' },
  concierge_quantity: { symbol: '1155', deposit: '50000', market: 'bursa' },
};

function formStateRecordDetail(flowKey, formState) {
  if (flowKey === 'manual_full') {
    return `symbol=${formState?.symbol} shares=${formState?.shares} market=${formState?.market}`;
  }
  if (flowKey === 'concierge_symbol') {
    return `mode=${formState?.mode} amount=${formState?.amount} inputMode=${formState?.inputMode} market=${formState?.market}`;
  }
  if (flowKey === 'concierge_quantity') {
    return `mode=${formState?.mode} symbol=${formState?.symbol} amount=${formState?.amount} investmentAmount=${formState?.investmentAmount} market=${formState?.market}`;
  }
  return JSON.stringify(formState ?? {});
}

function flowOpened(xml, f) {
  return (
    findTestId(xml, `manual-order-flow-${f.key}`) ||
    findTestId(xml, `manual-order-create-${f.key}`) ||
    [...texts(xml)].some((t) => t === f.title || t === CREATE)
  );
}

async function main() {
  logMemorySnapshot('before');
  const gate = checkE2eMemoryGate();
  if (!gate.ok) {
    console.error('E2E BLOCKED:', gate.reason);
    console.error(JSON.stringify(gate.snapshot));
    process.exit(3);
  }

  const ctx = initContext();
  const results = [];
  const record = createRecorder(results);

  try {
    await prepareDevice(ctx);
    await dismissSystemChrome(ctx);
    await sleep(1500);

    let ready = await ensureHomeReady(ctx, `flow-${flowKey}-prep`);
    if (!ready) {
      adb(`am start -n com.assistant.stocktrading/.MainActivity`);
      await sleep(8000);
      ready = await ensureHomeReady(ctx, `flow-${flowKey}-prep-retry`);
    }
    if (!ready) {
      record(`test-c-flow-${flowKey}-open`, 'FAIL', 'home 4 buttons not ready', await saveFailureArtifacts(`flow-${flowKey}-prep`, 'home not ready'));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }

    const baselineMandatory = await readPendingCountMandatory(ctx, `flow-${flowKey}-baseline`);
    const baseline = await readPendingAllProbesAsync(ctx, `flow-${flowKey}-baseline`, { openListFirst: true });
    let pending = baseline.ui ?? baselineMandatory.count ?? readPendingFromStorage() ?? readPendingFromAppState() ?? 0;
    record(`test-c-pending-baseline-${flowKey}`, 'PASS', `before=${pending}`, []);
    await returnToHome(ctx);

    const tag = `test-c-${flowKey}`;
    const flowStart = await ensureHomeFlowStart(ctx, `${tag}-pre`);
    record(`test-c-shade-${flowKey}`, flowStart.ok ? 'PASS' : 'PARTIAL', flowStart.detail, []);

    if (FORM_SEED_PAYLOAD[flowKey]) {
      const seeded = writeE2eManualOrderFormSeed(flowKey, FORM_SEED_PAYLOAD[flowKey]);
      record(
        `test-c-form-seed-${flowKey}`,
        seeded ? 'PASS' : 'PARTIAL',
        seeded ? 'seed written' : 'seed skipped (sqlite3 unavailable); using apply-seed probe',
        [],
      );
    }

    const open = await tapHomeFlowButtonWithRetry(ctx, flowKey, tag);
    if (!open.ok) {
      record(`test-c-flow-${flowKey}-open`, 'FAIL', `button not found activity=${currentActivity()}`, open.evidence || []);
      record(`test-c-e2e-${flowKey}`, 'FAIL', 'open failed', open.evidence || []);
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }
    await sleep(POST_TAP_MS);
    const fx = await dump(ctx, `${tag}-screen`);
    const opened = flowOpened(fx, flow);
    record(`test-c-flow-${flowKey}-open`, opened ? 'PASS' : 'FAIL', opened ? flow.title : 'not open', []);

    if (!opened) {
      record(`test-c-e2e-${flowKey}`, 'FAIL', 'flow screen not verified', await saveFailureArtifacts(`${tag}-open-fail`, 'flow title missing'));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }

    const readyCreate = await waitForCreateReady(ctx, flowKey, tag, record);
    if (!readyCreate.ok) {
      record(`test-c-e2e-${flowKey}`, 'FAIL', `create blocked: ${readyCreate.reason}`, await saveFailureArtifacts(`${tag}-blocked`, readyCreate.reason || 'blocked'));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }

    const inputs = await fillFlow(ctx, flowKey);
    if (!inputs.ok) {
      const detail = inputs.formState
        ? `form: ${(inputs.issues ?? []).join('; ')} state=${JSON.stringify(inputs.formState)}`
        : `inputs: ${(inputs.issues ?? []).join(', ')}`;
      record(`test-c-e2e-${flowKey}`, 'FAIL', detail, await saveFailureArtifacts(`${tag}-inputs`, detail));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }
    if (FLOWS_WITH_FORM_PROBE.has(flowKey)) {
      record(`test-c-form-state-${flowKey}`, 'PASS', formStateRecordDetail(flowKey, inputs.formState), []);
    }

    const before = pending;
    record(`test-c-pending-before-${flowKey}`, 'PASS', `before=${before}`, []);
    const tapResult = await tapCreate(ctx, tag, flowKey);
    if (!tapResult.ok) {
      const tapDetail = tapResult.disabled
        ? `create disabled: ${tapResult.label ?? tapResult.reason}`
        : tapResult.reason ?? 'create tap failed';
      record(`test-c-e2e-${flowKey}`, 'FAIL', tapDetail, await saveFailureArtifacts(`${tag}-create`, tapDetail));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }
    record(`test-c-create-tap-${flowKey}`, 'PASS', tapResult.via ?? 'testid', []);

    const outcome = await waitForCreateOutcome(ctx, tag);
    const alertResult = outcome.alertResult ?? { ok: true, reason: outcome.reason };
    if (!outcome.ok) {
      record(`test-c-e2e-${flowKey}`, 'FAIL', outcome.reason, await saveFailureArtifacts(`${tag}-outcome`, outcome.reason));
      saveResults(RESULT_FILE, { meta: buildMeta(), results });
      process.exitCode = 1;
      return;
    }
    record(
      `test-c-create-alert-${flowKey}`,
      alertResult.reason === 'no-alert' ? 'PARTIAL' : 'PASS',
      `alert=${alertResult.reason} probe=${outcome.probe ?? 'n/a'}`,
      [],
    );

    const { after: afterProbe } = await readPendingAfterCreate(ctx, tag);
    const evalResult = evaluatePendingAfterCreate(before, afterProbe, alertResult);
    record(`test-c-pending-after-${flowKey}`, evalResult.pass ? 'PASS' : 'FAIL', evalResult.detail, []);
    record(`test-c-e2e-${flowKey}`, evalResult.pass ? 'PASS' : 'FAIL', evalResult.detail, []);

    saveResults(RESULT_FILE, { meta: { ...buildMeta(), flow: flowKey, runTag: RUN_TAG }, results });
    process.exitCode = evalResult.pass ? 0 : 1;
  } finally {
    logMemorySnapshot('after');
    stopE2eNodeProcesses();
  }
}

main().catch((e) => {
  console.error(e);
  logMemorySnapshot('error');
  stopE2eNodeProcesses();
  process.exit(1);
});
