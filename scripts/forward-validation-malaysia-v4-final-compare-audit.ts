/**
 * npx tsx scripts/forward-validation-malaysia-v4-final-compare-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV4FinalCompareCsv,
  runMalaysiaV4FinalCompareAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4FinalCompareAudit';

async function main() {
  const report = await runMalaysiaV4FinalCompareAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-final-compare-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV4FinalCompareCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
