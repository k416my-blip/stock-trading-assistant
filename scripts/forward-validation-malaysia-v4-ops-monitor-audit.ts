/**
 * npx tsx scripts/forward-validation-malaysia-v4-ops-monitor-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV4OpsMonitorCsv,
  runMalaysiaV4OpsMonitorAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4OpsMonitorAudit';

async function main() {
  const report = await runMalaysiaV4OpsMonitorAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const csvPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-ops-monitor-audit.csv',
  );
  const jsonPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-ops-monitor-audit.json',
  );
  writeFileSync(csvPath, formatMalaysiaV4OpsMonitorCsv(report), 'utf8');
  writeFileSync(jsonPath, report.jsonPayload, 'utf8');
  console.log(`\nCSV: ${csvPath}`);
  console.log(`JSON: ${jsonPath}`);
}

void main();
