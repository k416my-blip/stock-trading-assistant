#!/usr/bin/env node
import { setTimeout as sleep } from 'node:timers/promises';
import {
  initContext,
  prepareDevice,
  buildMeta,
  createRecorder,
  saveResults,
  resultPath,
  OUT,
  FLOWS,
  TRUST_LABEL,
  POST_TAP_MS,
  CREATE,
  texts,
  dump,
  shot,
  dismissSystemChrome,
  setTrustMode,
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
const RESULT_FILE = resultPath('e');

async function main() {
  await prepareDevice(ctx);
  await dismissSystemChrome(ctx);
  await setDisplayMode(ctx, 'standard');
  await ensureHomeReady(ctx, 'test-e-prep');

  const switched = await setTrustMode(ctx);
  record('test-e-trust-mode-switch', switched ? 'PASS' : 'FAIL', TRUST_LABEL, switched ? [] : await saveFailureArtifacts('test-e-trust-switch', 'trust mode switch failed'));

  await returnToHome(ctx);
  await dismissSystemChrome(ctx);
  await sleep(3000);
  const { n, shots } = await scrollHomeShots(ctx, 'test-e', null);
  record('test-e-four-buttons', n === 4 ? 'PASS' : 'FAIL', `${n}/4`, shots);

  const open = await tapHomeFlowButton(ctx, FLOWS[0].key, 'test-e');
  if (!open.ok) {
    record('test-e-flow-open', 'FAIL', `concierge_full not tappable activity=${currentActivity()}`, open.evidence || []);
    saveResults(RESULT_FILE, { meta: buildMeta(), results });
    return;
  }
  await sleep(POST_TAP_MS);
  const fx = await dump(ctx, 'test-e-flow');
  shot('test-e-flow');
  const opened = [...texts(fx)].some((t) => t === FLOWS[0].title || t === CREATE);
  record('test-e-flow-open', opened ? 'PASS' : 'FAIL', FLOWS[0].title, ['test-e-flow.png', ...shots]);
  saveResults(RESULT_FILE, { meta: buildMeta(), results });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
