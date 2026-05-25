/**
 * Phase 5 full release verification suite
 * npx tsx src/verify/runRelease.verify.ts
 */
import { spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = process.cwd();

const steps: { label: string; cmd: string; args: string[] }[] = [
  { label: 'vitest (all)', cmd: 'npx', args: ['vitest', 'run'] },
  { label: 'commercial hardening', cmd: 'npx', args: ['tsx', join(ROOT, 'src/verify/runCommercialHardening.verify.ts')] },
  { label: 'diagnostics', cmd: 'npx', args: ['tsx', join(ROOT, 'src/verify/diagnostics.verify.ts')] },
  { label: 'release', cmd: 'npx', args: ['tsx', join(ROOT, 'src/verify/release.verify.ts')] },
  { label: 'personal-production', cmd: 'npx', args: ['tsx', join(ROOT, 'src/verify/personalProduction.verify.ts')] },
];

let failed = 0;

for (const step of steps) {
  console.log(`\n── ${step.label} ──`);
  const result = spawnSync(step.cmd, step.args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require ${join(ROOT, 'scripts/react-native-stub-register.cjs')}`.trim(),
    },
  });
  if (result.status !== 0) failed += 1;
}

console.log(`\n${failed === 0 ? '✓' : '✗'} release suite: ${steps.length - failed}/${steps.length} passed`);
if (failed > 0) process.exit(1);
