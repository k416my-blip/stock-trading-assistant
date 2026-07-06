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
  PKG,
  adb,
  SKIP_PM_CLEAR,
  waitForUiHydration,
  ensureLanguageJapanese,
  isJapaneseUiReady,
  dump,
  shot,
  findTestId,
  TIDS,
  dismissOnboarding,
  tapTab,
  ensureHomeReady,
} from './_deviceVerifyE2eCommon.mjs';

const ctx = initContext();
const results = [];
const record = createRecorder(results);
const RESULT_FILE = resultPath('a');

async function testA() {
  if (!SKIP_PM_CLEAR) {
    adb(`pm clear ${PKG}`);
    await sleep(3000);
  }
  adb(`am start -n ${PKG}/.MainActivity`);
  await waitForUiHydration(ctx, 'a', 180);

  const lang = await ensureLanguageJapanese(ctx);
  await dismissOnboarding(ctx);
  await tapTab(ctx, 'home');
  const after = await dump(ctx, 'a-after');
  shot('a-after');
  const onHome =
    findTestId(after, TIDS.homeManualOrderSection) ||
    findTestId(after, TIDS.homeManualOrderButton('concierge_full')) ||
    isJapaneseUiReady(after);
  record('test-a-language-ja', lang.ok ? 'PASS' : 'FAIL', lang.detail, ['a-after.png']);
  record('test-a-onboarding-dismiss', onHome ? 'PASS' : 'FAIL', onHome ? 'home reachable' : 'home not ready', ['a-after.png']);
  return onHome;
}

async function main() {
  await prepareDevice(ctx);
  record('test-a-metro', 'PASS', '8081/status ok', []);
  const ready = await testA();
  if (ready) await ensureHomeReady(ctx, 'a-post');
  saveResults(RESULT_FILE, { meta: buildMeta(), results });
}

main().catch((e) => {
  console.error(e);
  saveResults(RESULT_FILE, { meta: buildMeta(), results: [...results, { id: 'test-a-fatal', status: 'FAIL', detail: String(e.message) }] });
  process.exit(1);
});
