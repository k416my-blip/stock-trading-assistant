/**
 * npx tsx scripts/forward-validation-malaysia-v4-candidate-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV4CandidateCsv,
  runMalaysiaV4CandidateAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4CandidateAudit';

async function main() {
  const report = await runMalaysiaV4CandidateAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-candidate-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV4CandidateCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
