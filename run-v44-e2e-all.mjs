#!/usr/bin/env node
/**
 * Unified runner: A → B → C → D → E (separate processes, fresh state).
 */
process.env.PYTHONIOENCODING = 'utf-8';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  OUT,
  FLOWS,
  UX_MODES,
  TRUST_LABEL,
  buildMeta,
  gitHash,
  resolveGit,
  ensureMetroLink,
  adb,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';

const isRerun3 = process.argv.includes('--rerun3');
const REPORT = path.join(
  'docs',
  'review',
  isRerun3 ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN3_REPORT.md' : 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN2_REPORT.md',
);
const MERGED_JSON = isRerun3 ? 'results-e2e-rerun3-merged.json' : 'results-e2e-rerun2-merged.json';
const STEPS = [
  { script: 'run-v44-e2e-a-onboarding.mjs', result: 'results-e2e-a.json' },
  { script: 'run-v44-e2e-b-home-buttons.mjs', result: 'results-e2e-b.json' },
  { script: 'run-v44-e2e-d-ux-modes.mjs', result: 'results-e2e-d.json' },
  { script: 'run-v44-e2e-c-create-list.mjs', result: 'results-e2e-c.json' },
  { script: 'run-v44-e2e-e-trust.mjs', result: 'results-e2e-e.json' },
];

function runStep(script) {
  console.log('\n==========', script, '==========\n');
  execSync(`node ${script}`, { stdio: 'inherit', encoding: 'utf8' });
}

function mergeResults() {
  const all = [];
  let meta = buildMeta();
  for (const step of STEPS) {
    const p = path.join(OUT, step.result);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.meta) meta = { ...meta, ...data.meta };
    all.push(...(data.results || []));
  }
  fs.writeFileSync(path.join(OUT, MERGED_JSON), JSON.stringify({ meta, results: all }, null, 2), 'utf8');
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
    return `| ${label} | ${op?.status ?? '—'} | ${e2e?.status ?? '—'} | ${e2e?.detail ?? '—'} |`;
  };
  const modeRow = (prefix, label) => {
    const sw = pick(`${prefix}-mode-switch`);
    const bt = pick(`${prefix}-four-buttons`);
    const fo = pick(`${prefix}-flow-open`);
    return `| ${label} | ${sw?.status ?? '—'} | ${bt?.detail ?? bt?.status ?? '—'} | ${fo?.status ?? '—'} |`;
  };

  const reportTitle = isRerun3
    ? '# Device Verify v44 — E2E Final Rerun 3 Report'
    : '# Device Verify v44 — E2E Final Rerun 2 Report';
  const artifactDir = isRerun3 ? 'rerun3-artifacts' : 'rerun2-artifacts';

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
    '## Manual order list policy',
    '- **Live analysis required**: No — lists are for Rakuten manual hand-entry only; practice mode may create lists.',
    `- **Practice mode create allowed**: ${pick('test-c-app-mode')?.status === 'PASS' ? 'Yes (product + E2E)' : pick('test-c-prerequisite')?.status === 'PASS' ? 'Yes (E2E ran)' : 'See Test C'}`,
    '',
    '## Commands',
    '```powershell',
    'chcp 65001',
    "$env:PYTHONIOENCODING='utf-8'",
    '. .\\scripts\\git-env.ps1',
    'npm run start:clear',
    'adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081',
    'node run-v44-e2e-all.mjs --rerun3',
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
    '## Test C — create → list',
    '| Flow | Open | E2E | Pending |',
    '|------|------|-----|---------|',
    ...FLOWS.map((f) => flowRow(f.key, f.home)),
    '',
    `Baseline: ${pick('test-c-pending-baseline')?.detail ?? '—'}`,
    `App mode policy: ${pick('test-c-app-mode')?.detail ?? pick('test-c-prerequisite')?.detail ?? '—'}`,
    '',
    '## Test D — UX modes',
    '| Mode | Switch | 4 buttons | Flow open |',
    '|------|--------|-----------|-----------|',
    modeRow('test-d-beginner', 'Beginner'),
    modeRow('test-d-standard', 'Standard'),
    modeRow('test-d-pro', 'Pro'),
    '',
    '## Test E — Trust',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...['test-e-trust-mode-switch', 'test-e-four-buttons', 'test-e-flow-open'].map((id) => {
      const r = pick(id);
      return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
    }).filter(Boolean),
    '',
    '## Evidence',
    '- Screenshots/XML: `docs/review/device-verify-v44/`',
    `- Failure artifacts: \`docs/review/device-verify-v44/${artifactDir}/\``,
    `- Merged JSON: \`docs/review/device-verify-v44/${MERGED_JSON}\``,
    `- Per-step logs: \`e2e-rerun${isRerun3 ? '3' : '2'}-run-*.log\``,
    '',
    '## AAB',
    '- **Created**: No — Build Credit 節約のため今回は未作成',
    '',
    '## Git manual',
    '```powershell',
    '. .\\scripts\\git-env.ps1',
    'git --version',
    'git push origin cursor/top3-maxdd-capital-audit',
    '```',
  ];

  if (fail > 0 || partial > 0) {
    lines.push('', '## Remaining failures');
    for (const r of results.filter((x) => x.status !== 'PASS')) {
      lines.push(`- **${r.id}** (${r.status}): ${r.detail}`);
    }
  }

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return { overall, pass, partial, fail };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--merge-only')) {
    const { meta, results } = mergeResults();
    const summary = writeReport(meta, results, 'pending post-rerun commit');
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

  const { meta, results } = mergeResults();
  const summary = writeReport(meta, results, 'pending post-run commit');
  console.log('DONE', summary);

  // commit + push
  const git = resolveGit();
  let pushStatus = 'not attempted';
  if (git) {
    try {
      execSync(`"${git}" add run-v44-e2e-*.mjs _deviceVerifyE2eCommon.mjs _deviceVerifyAdb.mjs src/constants/deviceVerifyTestIds.ts src/components/ModeToggle.tsx src/screens/ManualOrderFlowScreen.tsx src/screens/SettingsScreen.tsx docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN2_REPORT.md docs/review/device-verify-v44/results-e2e-rerun2-merged.json`, { stdio: 'inherit' });
      execSync(`"${git}" commit -m "$(cat <<'EOF'
fix: Device Verify v44 E2E rerun2 — split scripts, live mode, pending probes

EOF
)"`, { stdio: 'inherit', shell: '/bin/bash' });
    } catch {
      try {
        execSync(`"${git}" commit -m "fix: Device Verify v44 E2E rerun2 split scripts and probes"`, { stdio: 'inherit' });
      } catch (e) {
        pushStatus = `commit failed: ${e.message}`;
      }
    }
    try {
      execSync(`"${git}" push origin cursor/top3-maxdd-capital-audit`, { stdio: 'inherit' });
      pushStatus = 'SUCCESS';
    } catch (e) {
      pushStatus = `push failed: ${e.message}`;
    }
  }

  const hash = gitHash();
  writeReport(meta, results, pushStatus === 'SUCCESS' ? `SUCCESS (${hash})` : pushStatus);
  console.log('Report:', REPORT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
