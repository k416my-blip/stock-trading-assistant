/**
 * npx tsx scripts/forward-validation-malaysia-v3-cap15-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV3Cap15Csv,
  runMalaysiaV3Cap15Audit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV3Cap15Audit';

async function main() {
  const report = await runMalaysiaV3Cap15Audit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(process.cwd(), 'scripts', 'forward-validation-malaysia-v3-cap15-audit.csv');
  writeFileSync(outPath, formatMalaysiaV3Cap15Csv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
