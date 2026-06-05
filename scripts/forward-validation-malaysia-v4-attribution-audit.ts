/**
 * npx tsx scripts/forward-validation-malaysia-v4-attribution-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV4AttributionCsv,
  runMalaysiaV4AttributionAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4AttributionAudit';

async function main() {
  const report = await runMalaysiaV4AttributionAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-attribution-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV4AttributionCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
