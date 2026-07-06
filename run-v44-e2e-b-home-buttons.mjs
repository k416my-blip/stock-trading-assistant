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
  adb,
  scrollHomeShots,
  tapTab,
  ensureHomeReady,
  dump,
  shot,
  findTestId,
  TIDS,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';

const ctx = initContext();
const results = [];
const record = createRecorder(results);
const RESULT_FILE = resultPath('b');

async function testHomeStability() {
  await tapTab(ctx, 'home');
  let stable = true;
  for (let i = 0; i < 4; i++) {
    await sleep(5000);
    const xml = await dump(ctx, `b-stability-${i}`);
    shot(`b-stability-${i}`);
    const onHome =
      findTestId(xml, TIDS.homeManualOrderSection) ||
      findTestId(xml, TIDS.homeManualOrderButton('concierge_full'));
    if (!onHome) stable = false;
  }
  record('test-b-home-stability', stable ? 'PASS' : 'FAIL', stable ? '20s home stable' : 'left home tab', ['b-stability-3.png']);
}

async function main() {
  await prepareDevice(ctx);
  adb(`am start -n ${PKG}/.MainActivity`);
  await sleep(5000);
  await ensureHomeReady(ctx, 'b-prep');
  await scrollHomeShots(ctx, 'test-b', record);
  await testHomeStability();
  saveResults(RESULT_FILE, { meta: buildMeta(), results });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
