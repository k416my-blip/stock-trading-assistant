/**
 * HyperOS / Android power restriction audit for long-run survival.
 *
 * Usage:
 *   node scripts/audit-hyperos-power-restrictions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const PKG = 'com.assistant.stocktrading';
const SERIAL = process.env.ANDROID_SERIAL ?? process.env.ADB_SERIAL ?? 'FYRWXSNNAIOR9DCM';
const OUT_DIR = path.join(ROOT, 'docs/review/hyperos-screen-off-survival');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 }).trim();
}

function adb(cmd) {
  try {
    return sh(`adb -s ${SERIAL} ${cmd}`);
  } catch (e) {
    return e.stderr?.toString?.() || e.message || '';
  }
}

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function section(title, body) {
  return `## ${title}\n\n\`\`\`\n${body.slice(0, 12000)}\n\`\`\`\n`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const runId = ts();
  const evidence = {
    runId,
    serial: SERIAL,
    package: PKG,
    capturedAt: new Date().toISOString(),
    sections: {},
  };

  const cmds = [
    ['deviceidle_whitelist', 'shell dumpsys deviceidle whitelist'],
    ['standby_bucket', `shell am get-standby-bucket ${PKG}`],
    ['background_restricted', `shell cmd activity get-background-restriction-exemption ${PKG}`],
    ['appops_run_any', `shell cmd appops get ${PKG} RUN_ANY_IN_BACKGROUND`],
    ['appops_wakelock', `shell cmd appops get ${PKG} WAKE_LOCK`],
    ['power_doze', 'shell dumpsys deviceidle'],
    ['power_summary', 'shell dumpsys power'],
    ['activity_services', `shell dumpsys activity services ${PKG}`],
    ['proc_state', 'shell dumpsys activity processes'],
    ['battery_properties', 'shell dumpsys battery'],
    ['miui_powerkeeper', 'shell dumpsys activity provider com.miui.powerkeeper'],
  ];

  let md = `# HyperOS Power Restriction Audit\n\n| Field | Value |\n|-------|-------|\n| runId | ${runId} |\n| device | ${SERIAL} |\n| package | ${PKG} |\n| capturedAt | ${evidence.capturedAt} |\n\n`;

  for (const [key, cmdTail] of cmds) {
    let out = adb(cmdTail);
    if (key === 'proc_state') {
      out = out
        .split('\n')
        .filter((l) => l.includes(PKG))
        .slice(0, 40)
        .join('\n');
    } else if (['power_doze', 'power_summary', 'miui_powerkeeper', 'activity_services', 'battery_properties'].includes(key)) {
      out = out.split('\n').slice(0, 80).join('\n');
    }
    if (key === 'deviceidle_whitelist') {
      const whitelisted = out.includes(PKG);
      out = `whitelisted=${whitelisted}\n${out.split('\n').filter((l) => l.includes('whitelist') || l.includes(PKG)).slice(0, 25).join('\n')}`;
    }
    evidence.sections[key] = out;
    md += section(key, out);
  }

  // Apply mitigations (best-effort, no UI)
  const mitigations = [];
  try {
    adb(`shell dumpsys deviceidle whitelist +${PKG}`);
    mitigations.push('deviceidle whitelist +');
  } catch {
    mitigations.push('deviceidle whitelist failed');
  }
  try {
    adb(`shell cmd appops set ${PKG} RUN_ANY_IN_BACKGROUND allow`);
    mitigations.push('RUN_ANY_IN_BACKGROUND allow');
  } catch {
    mitigations.push('RUN_ANY_IN_BACKGROUND failed');
  }

  evidence.mitigations = mitigations;
  md += `## Applied mitigations\n\n${mitigations.map((m) => `- ${m}`).join('\n')}\n`;

  const jsonPath = path.join(OUT_DIR, `hyperos-power-audit-${runId}.json`);
  const mdPath = path.join(OUT_DIR, `hyperos-power-audit-${runId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
  fs.writeFileSync(mdPath, md);
  console.log(JSON.stringify({ ok: true, jsonPath, mdPath, mitigations }));
}

main();
