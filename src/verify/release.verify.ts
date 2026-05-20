/**
 * npx tsx src/verify/release.verify.ts
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { assessReleaseReadiness } from '../services/releaseReadiness';
import { PRODUCTION_READINESS_CHECKLIST } from '../constants/releaseReadiness';

let failed = 0;

function fail(msg: string) {
  console.error(`✗ ${msg}`);
  failed += 1;
}
function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

if (PRODUCTION_READINESS_CHECKLIST.length >= 8) {
  pass('production readiness checklist defined');
} else {
  fail('checklist too short');
}

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const requiredScripts = [
  'typecheck',
  'lint',
  'test',
  'verify:security',
  'verify:release',
  'verify:diagnostics',
  'verify:integration',
  'verify:personal-production',
  'verify:full-audit',
];
for (const s of requiredScripts) {
  if (pkg.scripts?.[s]) pass(`package script: ${s}`);
  else fail(`missing package script: ${s}`);
}

const ciPath = join(process.cwd(), '.github/workflows/ci.yml');
if (existsSync(ciPath)) pass('GitHub Actions CI workflow exists');
else fail('.github/workflows/ci.yml missing');

const vitestPath = join(process.cwd(), 'vitest.config.ts');
if (existsSync(vitestPath)) pass('vitest.config.ts exists');
else fail('vitest.config.ts missing');

try {
  readFileSync(join(process.cwd(), 'src/services/environmentValidation.ts'), 'utf8');
  pass('environmentValidation service exists');
} catch {
  fail('environmentValidation missing');
}

const assessment = assessReleaseReadiness({
  typecheckOk: true,
  lintOk: true,
  unitTestsOk: true,
  integrationTestsOk: true,
  verifyScriptsOk: true,
  securityVerifyOk: true,
});
if (assessment.ready) pass('release assessment passes with CI flags');
else fail(`release assessment blocked: ${assessment.blockers.join(', ')}`);

console.log(`\n${failed === 0 ? '✓' : '✗'} release verify`);
if (failed > 0) process.exit(1);
