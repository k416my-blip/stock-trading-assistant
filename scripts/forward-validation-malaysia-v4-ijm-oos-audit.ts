/**
 * npx tsx scripts/forward-validation-malaysia-v4-ijm-oos-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV4IjmOosCsv,
  runMalaysiaV4IjmOosAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4IjmOosAudit';

async function main() {
  const report = await runMalaysiaV4IjmOosAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-ijm-oos-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV4IjmOosCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
