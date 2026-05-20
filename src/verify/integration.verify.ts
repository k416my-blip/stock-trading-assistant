/**
 * Spawns Vitest integration/recovery/execution/persistence suites
 * npx tsx src/verify/integration.verify.ts
 */
import { spawnSync } from 'child_process';

const patterns = [
  'tests/integration',
  'tests/recovery',
  'tests/execution',
  'tests/persistence',
];

const result = spawnSync(
  'npx',
  ['vitest', 'run', ...patterns],
  { stdio: 'inherit', shell: true, cwd: process.cwd() },
);

if (result.status !== 0) {
  console.error('\n✗ integration verify failed');
  process.exit(1);
}
console.log('\n✓ integration verify passed');
