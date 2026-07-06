#!/usr/bin/env node
/**
 * Device Verify v44 unified runner.
 * --rerun4  A → B → C only (create→list priority; modes separated)
 * --rerun3  legacy full A → B → D → C → E
 */
process.env.PYTHONIOENCODING = 'utf-8';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  OUT,
  FLOWS,
  buildMeta,
  gitHash,
  resolveGit,
  ensureMetroLink,
  writeUtf8File,
  adb,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';

const isRerun4 = process.argv.includes('--rerun4');
const isRerun3 = process.argv.includes('--rerun3');
const RUN_TAG = isRerun4 ? 'rerun4' : isRerun3 ? 'rerun3' : 'rerun2';

const REPORT = path.join(
  'docs',
  'review',
  isRerun4
    ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN4_REPORT.md'
    : isRerun3
      ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN3_REPORT.md'
      : 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN2_REPORT.md',
);

const CORE_STEPS = [
  { script: 'run-v44-e2e-a-onboarding.mjs', step: 'a' },
  { script: 'run-v44-e2e-b-home-buttons.mjs', step: 'b' },
  { script: 'run-v44-e2e-c-create-list.mjs', step: 'c' },
];

const LEGACY_STEPS = [
  { script: 'run-v44-e2e-a-onboarding.mjs', step: 'a-position' },
  { script: 'run-v44-e2e-b-home-buttons.mjs', step: 'b' },
  { script: 'run-v44-e2e-d-ux-modes.mjs', step: 'd' },
  { script: 'run-v44-e2e-c-create-list.mjs', step: 'c' },
  { script: 'run-v44-e2e-e-trust.mjs', step: 'e' },
];

const STEPS = isRerun4 ? CORE_STEPS : LEGACY_STEPS.map((s, i) => ({ ...s, step: ['a', 'b', 'd', 'c', 'e'][i] }));
const MERGED_JSON = `results-${RUN_TAG}-merged.json`;

const DEPRECATED_IDS = new Set([
  'test-c-live-mode',
  'test-c-practice-nav',
  'test-c-live-analysis-required',
]);

function resultFile(step) {
  return path.join(OUT, `results-${RUN_TAG}-${step}.json`);
}

function runStep(script) {
  console.log('\n==========', script, `(tag=${RUN_TAG})`, '==========\n');
  try {
    execSync(`node ${script}`, {
      stdio: 'inherit',
      encoding: 'utf8',
      env: { ...process.env, E2E_RUN_TAG: RUN_TAG, PYTHONIOENCODING: 'utf-8' },
    });
    return true;
  } catch (e) {
    console.error(`STEP FAILED: ${script}`, e.message);
    return false;
  }
}

function mergeResults() {
  const all = [];
  let meta = buildMeta();
  const steps = isRerun4 ? ['a', 'b', 'c'] : ['a', 'b', 'd', 'c', 'e'];
  for (const step of steps) {
    const p = resultFile(step);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.meta) meta = { ...meta, ...data.meta };
    for (const r of data.results || []) {
      if (DEPRECATED_IDS.has(r.id)) continue;
      all.push(r);
    }
  }
  writeUtf8File(path.join(OUT, MERGED_JSON), `${JSON.stringify({ meta, results: all }, null, 2)}\n`);
  return { meta, results: all };
}

function writeReport(meta, results, pushInfo) {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const overall = fail === 0 && partial === 0 ? 'PASS' : pass > 0 ? 'PARTIAL' : 'FAIL';

  const pick = (id) => results.find((r) => r.id === id);
  const flowRow = (key, label) => {
    const op = pick(`test-c-flow-${key}-open`);
    const e2e = pick(`test-c-e2e-${key}`);
    return `| ${label} | ${op?.status ?? 'N/A'} | ${e2e?.status ?? 'N/A'} | ${e2e?.detail ?? 'N/A'} |`;
  };

  const reportTitle = isRerun4
    ? '# Device Verify v44 - E2E Final Rerun 4 Report'
    : isRerun3
      ? '# Device Verify v44 — E2E Final Rerun 3 Report'
      : '# Device Verify v44 — E2E Final Rerun 2 Report';

  const lines = [
    reportTitle,
    '',
    `- **Overall**: **${overall}**`,
    `- **PASS / PARTIAL / FAIL**: ${pass} / ${partial} / ${fail}`,
    `- **Device**: ${meta.model} (${meta.serial})`,
    `- **versionCode**: ${meta.versionCode}`,
    `- **Timestamp**: ${meta.timestamp}`,
    `- **Git commit**: \`${gitHash()}\``,
    `- **Push**: ${pushInfo}`,
    '',
  ];

  if (pick('test-a-fatal')) {
    lines.push(
      '## Run infrastructure',
      '- Test A aborted mid-run: adb `input` service unavailable (`cmd: Can\'t find service: input`) — USB disconnect suspected.',
      '- B/C did not run. Re-run when device is stable: `node run-v44-e2e-all.mjs --rerun4`',
      '',
    );
  }

  lines.push(
    '## E2E script fixes (rerun4)',
    '- Removed `enableLiveAnalysisMode` and `test-c-live-mode` from all runners.',
    '- Removed `settings-nav-practice-mode` lookup — no longer fails create→list in practice mode.',
    '- Merge uses isolated `results-rerun4-{a,b,c}.json` (stale rerun3 live-mode rows excluded).',
    '- Standard/Pro/Trust moved to `run-v44-e2e-modes.mjs`.',
    '',
    '## Manual order list policy',
    '- **Live analysis required**: No - lists are for Rakuten manual hand-entry only; practice mode may create lists.',
    `- **Practice mode create allowed**: ${pick('test-c-app-mode')?.status === 'PASS' ? 'Yes (E2E confirmed)' : 'See Test C results'}`,
    '',
    '## Commands',
    '```powershell',
    'chcp 65001',
    "$env:PYTHONIOENCODING='utf-8'",
    "$env:E2E_RUN_TAG='rerun4'",
    '. .\\scripts\\git-env.ps1',
    'npm run start:clear',
    'adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081',
    'node run-v44-e2e-all.mjs --rerun4',
    '```',
    '',
    '## adb devices',
    '```',
    meta.adbDevices || '',
    '```',
    '',
    '## Language / onboarding / home',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...['test-a-language-ja', 'test-a-onboarding-dismiss', 'test-b-four-buttons', 'test-b-home-stability'].map((id) => {
      const r = pick(id);
      return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
    }).filter(Boolean),
    '',
    '## Test C - create to list (4 flows)',
    '| Flow | Open | E2E | Pending |',
    '|------|------|-----|---------|',
    ...FLOWS.map((f) => flowRow(f.key, f.home)),
    '',
    `**Pending baseline**: ${pick('test-c-pending-baseline')?.detail ?? 'N/A'}`,
    `**App mode policy**: ${pick('test-c-app-mode')?.detail ?? 'N/A'}`,
    '',
  );

  if (isRerun4) {
    lines.push(
      '## Standard / Pro / Trust mode checks',
      '- **Executed in this run**: No',
      '- **Reason**: Mode switching (Standard / Pro / Beginner / Trust) is separated into `run-v44-e2e-modes.mjs` so create→list 4 flows can pass first without UX-mode navigation blocking Test C.',
      '- **Run separately**: `node run-v44-e2e-modes.mjs`',
      '',
    );
  } else {
    lines.push(
      '## Test D — UX modes',
      '| Mode | Switch | 4 buttons | Flow open |',
      '|------|--------|-----------|-----------|',
      ...['test-d-beginner', 'test-d-standard', 'test-d-pro'].map((prefix) => {
        const sw = pick(`${prefix}-mode-switch`);
        const bt = pick(`${prefix}-four-buttons`);
        const fo = pick(`${prefix}-flow-open`);
        const label = prefix.replace('test-d-', '');
        return `| ${label} | ${sw?.status ?? '—'} | ${bt?.detail ?? bt?.status ?? '—'} | ${fo?.status ?? '—'} |`;
      }),
      '',
      '## Test E — Trust',
      '| Check | Status | Detail |',
      '|-------|--------|--------|',
      ...['test-e-trust-mode-switch', 'test-e-four-buttons', 'test-e-flow-open'].map((id) => {
        const r = pick(id);
        return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
      }).filter(Boolean),
      '',
    );
  }

  lines.push(
    '## UTF-8 / mojibake fix',
    '- Markdown: UTF-8 with BOM via writeUtf8File',
    '- Node: PYTHONIOENCODING=utf-8',
    '- PowerShell: chcp 65001 before run; avoid Tee-Object -Encoding on older PS',
    '- Report uses ASCII hyphen instead of em-dash for console compatibility',
    '',
    '## Evidence',
    '- Screenshots/XML: `docs/review/device-verify-v44/`',
    `- Failure artifacts: \`docs/review/device-verify-v44/${RUN_TAG}-artifacts/\``,
    `- Merged JSON: \`docs/review/device-verify-v44/${MERGED_JSON}\``,
    '',
    '## AAB',
    '- **Created**: No - Build Credit saving; AAB not built this run',
    '',
    '## Git manual',
    '```powershell',
    '. .\\scripts\\git-env.ps1',
    'git --version',
    'git push origin cursor/top3-maxdd-capital-audit',
    '```',
  );

  if (fail > 0 || partial > 0) {
    lines.push('', '## Remaining failures');
    for (const r of results.filter((x) => x.status !== 'PASS')) {
      lines.push(`- **${r.id}** (${r.status}): ${r.detail}`);
    }
  }

  writeUtf8File(REPORT, `\ufeff${lines.join('\n')}\n`);
  return { overall, pass, partial, fail };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--merge-only')) {
    process.env.E2E_RUN_TAG = RUN_TAG;
    const { meta, results } = mergeResults();
    const summary = writeReport(meta, results, 'merge-only (no push)');
    console.log('MERGE DONE', summary);
    return;
  }

  const metroOk = await ensureMetroLink();
  if (!metroOk) {
    console.error('FATAL: Start Metro first (npm run start:clear)');
    process.exit(2);
  }
  adb(`am force-stop ${PKG}`);
  await new Promise((r) => setTimeout(r, 2000));

  for (const step of STEPS) {
    runStep(step.script);
  }

  let pushStatus = 'not attempted';
  const git = resolveGit();
  if (git) {
    try {
      execSync(
        `"${git}" add run-v44-e2e-*.mjs _deviceVerifyE2eCommon.mjs _deviceVerifyAdb.mjs docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN4_REPORT.md docs/review/device-verify-v44/results-${RUN_TAG}-*.json docs/review/device-verify-v44/${MERGED_JSON}`,
        { stdio: 'inherit' },
      );
      execSync(`"${git}" commit -m "fix: Device Verify v44 E2E rerun4 — remove live-mode gate, core ABC only"`, { stdio: 'inherit' });
      try {
        execSync(`"${git}" push origin cursor/top3-maxdd-capital-audit`, { stdio: 'inherit' });
        pushStatus = `SUCCESS (${gitHash()})`;
      } catch (e) {
        pushStatus = `push failed: ${e.message}`;
      }
    } catch (e) {
      pushStatus = `commit skipped or failed: ${e.message}`;
    }
  }

  const { meta, results } = mergeResults();
  const summary = writeReport(meta, results, pushStatus);
  console.log('DONE', summary);
  console.log('Report:', REPORT, 'tag=', RUN_TAG);
  const fails = results.filter((r) => r.status === 'FAIL').length;
  if (fails > 0 && !process.argv.includes('--allow-partial')) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
