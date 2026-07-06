#!/usr/bin/env node
import { setTimeout as sleep } from 'node:timers/promises';
import {
  initContext,
  prepareDevice,
  buildMeta,
  createRecorder,
  saveResults,
  loadResults,
  OUT,
  PKG,
  adb,
  SKIP_PM_CLEAR,
  waitForUiHydration,
  dismissPermissionDialogs,
  findLanguageJa,
  tap,
  dump,
  shot,
  texts,
  findTestId,
  TIDS,
  dismissOnboarding,
  tapTab,
  ensureHomeReady,
  JA_LABEL,
} from './_deviceVerifyE2eCommon.mjs';

const ctx = initContext();
const results = [];
const record = createRecorder(results);
const RESULT_FILE = `${OUT}/results-e2e-a.json`;

async function testA() {
  if (!SKIP_PM_CLEAR) {
    adb(`pm clear ${PKG}`);
    await sleep(3000);
  }
  adb(`am start -n ${PKG}/.MainActivity`);
  await waitForUiHydration(ctx, 'a', 180);

  let picked = false;
  for (let i = 0; i < 15; i++) {
    const xml = await dump(ctx, `a-lang-${i}`);
    await dismissPermissionDialogs(ctx);
    if (!xml) continue;
    shot(`a-lang-${i}`);
    const ja = findLanguageJa(xml);
    if (ja) {
      tap(ja);
      await sleep(6000);
      picked = true;
      break;
    }
    await sleep(2000);
  }

  await dismissOnboarding(ctx);
  await tapTab(ctx, 'home');
  const after = await dump(ctx, 'a-after');
  shot('a-after');
  const onHome =
    findTestId(after, TIDS.homeManualOrderSection) ||
    [...texts(after)].some((t) => t === '\u30db\u30fc\u30e0' || t === 'Home');
  const ok = picked && onHome;
  record('test-a-language-ja', ok ? 'PASS' : picked ? 'PARTIAL' : 'FAIL', ok ? `${JA_LABEL} selected` : 'language-ja not found', ['a-after.png']);
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
