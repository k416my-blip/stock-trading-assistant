#!/usr/bin/env node
import { setTimeout as sleep } from 'node:timers/promises';
import {
  initContext,
  prepareDevice,
  dismissSystemChrome,
  buildMeta,
  createRecorder,
  saveResults,
  OUT,
  UX_MODES,
  FLOWS,
  POST_TAP_MS,
  CREATE,
  texts,
  dump,
  shot,
  setDisplayMode,
  ensureHomeReady,
  scrollHomeShots,
  tapHomeFlowButton,
  returnToHome,
  saveFailureArtifacts,
  currentActivity,
} from './_deviceVerifyE2eCommon.mjs';

const ctx = initContext();
const results = [];
const record = createRecorder(results);
const RESULT_FILE = `${OUT}/results-e2e-d.json`;

async function verifyUxMode(mode) {
  const prefix = `test-d-${mode.key}`;
  const switched = await setDisplayMode(ctx, mode.key);
  record(`${prefix}-mode-switch`, switched ? 'PASS' : 'FAIL', mode.label, switched ? [] : await saveFailureArtifacts(`${prefix}-switch`, 'ux mode row missing'));

  await returnToHome(ctx);
  await sleep(2000);
  const { n, shots } = await scrollHomeShots(ctx, prefix, null);
  record(`${prefix}-four-buttons`, n === 4 ? 'PASS' : 'FAIL', `${n}/4`, shots);

  const open = await tapHomeFlowButton(ctx, FLOWS[0].key, prefix);
  if (!open.ok) {
    record(`${prefix}-flow-open`, 'FAIL', `concierge_full not tappable activity=${currentActivity()}`, open.evidence || []);
    return;
  }
  await sleep(POST_TAP_MS);
  const fx = await dump(ctx, `${prefix}-flow`);
  shot(`${prefix}-flow`);
  const opened = [...texts(fx)].some((t) => t === FLOWS[0].title || t === CREATE);
  record(`${prefix}-flow-open`, opened ? 'PASS' : 'FAIL', FLOWS[0].title, [`${prefix}-flow.png`]);
  await returnToHome(ctx);
}

async function main() {
  await prepareDevice(ctx);
  await dismissSystemChrome(ctx);
  await ensureHomeReady(ctx, 'test-d-prep');
  for (const mode of UX_MODES) await verifyUxMode(mode);
  saveResults(RESULT_FILE, { meta: buildMeta(), results });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
