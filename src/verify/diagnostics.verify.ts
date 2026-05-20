/**
 * npx tsx src/verify/diagnostics.verify.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  clearDiagnosticEvents,
  exportDiagnosticsReport,
  exportDiagnosticsReportJson,
  recordDiagnosticEvent,
} from '../services/structuredDiagnostics';

const ROOT = join(process.cwd(), 'src');
let failed = 0;

function fail(msg: string) {
  console.error(`✗ ${msg}`);
  failed += 1;
}
function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

clearDiagnosticEvents();
recordDiagnosticEvent({
  type: 'verify',
  severity: 'info',
  module: 'diagnostics.verify',
  message: 'apikey=sk_live_secretvalue123456',
});

const report = exportDiagnosticsReport();
if (report.eventCount < 1) fail('report should contain events');
else pass('diagnostics report exports events');

const json = exportDiagnosticsReportJson();
if (json.includes('sk_live_secretvalue123456')) fail('report must redact secrets');
else pass('diagnostics report redacts secrets');

try {
  readFileSync(join(ROOT, 'services/structuredDiagnostics.ts'), 'utf8');
  pass('structuredDiagnostics service exists');
} catch {
  fail('structuredDiagnostics missing');
}

try {
  const crash = readFileSync(join(ROOT, 'services/crashSimulation.ts'), 'utf8');
  if (crash.includes('assertSimulationEnabled')) pass('crash simulation gated');
  else fail('crash simulation missing gate');
} catch {
  fail('crashSimulation missing');
}

console.log(`\n${failed === 0 ? '✓' : '✗'} diagnostics verify`);
if (failed > 0) process.exit(1);
