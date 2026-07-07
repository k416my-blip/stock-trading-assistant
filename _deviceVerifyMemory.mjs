#!/usr/bin/env node
/** Memory snapshot + E2E start gate (OOM prevention). */
import { execSync } from 'node:child_process';

const CURSOR_MAX_MB = Number(process.env.E2E_CURSOR_MAX_MB || 5120);
const SYSTEM_MAX_PCT = Number(process.env.E2E_SYSTEM_MAX_PCT || 80);

function psJson(script) {
  try {
    const out = execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 4 * 1024 * 1024,
    }).trim();
    return JSON.parse(out || '{}');
  } catch {
    return {};
  }
}

export function memorySnapshot(label = 'snapshot') {
  const data = psJson(`
$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessName -match '^(node|adb|java)$' -or $_.ProcessName -like 'Cursor*' -or $_.ProcessName -like '*gradle*'
}
$rows = @($procs | Group-Object ProcessName | ForEach-Object {
  [PSCustomObject]@{ name = $_.Name; count = $_.Count; mb = [math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1) }
})
$cursorMb = [math]::Round(($procs | Where-Object { $_.ProcessName -like 'Cursor*' } | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)
$os = Get-CimInstance Win32_OperatingSystem
$totalGb = [math]::Round($os.TotalVisibleMemorySize / 1MB / 1024, 2)
$freeGb = [math]::Round($os.FreePhysicalMemory / 1MB / 1024, 2)
$usedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
[PSCustomObject]@{
  label = '${label.replace(/'/g, "''")}'
  cursorMb = $cursorMb
  processes = $rows
  totalGb = $totalGb
  freeGb = $freeGb
  usedPct = $usedPct
} | ConvertTo-Json -Compress
`);
  return data;
}

export function logMemorySnapshot(label) {
  const s = memorySnapshot(label);
  console.log('MEMORY-SNAPSHOT', JSON.stringify(s));
  return s;
}

export function checkE2eMemoryGate() {
  const s = memorySnapshot('gate');
  const cursorMb = Number(s.cursorMb || 0);
  const usedPct = Number(s.usedPct || 0);
  const renderer = (s.processes || []).find((p) => /renderer/i.test(p.name));
  const rendererMb = renderer ? Number(renderer.mb || 0) : 0;

  if (cursorMb > CURSOR_MAX_MB) {
    return {
      ok: false,
      reason: `Cursor total ${cursorMb}MB > ${CURSOR_MAX_MB}MB — quit Cursor completely before E2E`,
      snapshot: s,
    };
  }
  if (usedPct > SYSTEM_MAX_PCT) {
    return {
      ok: false,
      reason: `System memory ${usedPct}% > ${SYSTEM_MAX_PCT}%`,
      snapshot: s,
    };
  }
  if (rendererMb > 2048) {
    return {
      ok: false,
      reason: `Cursor Renderer ${rendererMb}MB > 2048MB — full quit required (not Reload Window)`,
      snapshot: s,
    };
  }
  return { ok: true, reason: null, snapshot: s };
}

export function stopE2eNodeProcesses() {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -match 'run-v44-e2e' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'pipe', encoding: 'utf8' },
    );
  } catch {}
}
