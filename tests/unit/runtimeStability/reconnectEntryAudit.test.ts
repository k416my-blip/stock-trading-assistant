import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../../src');
const FORBIDDEN = 'scheduleWebsocketReconnectWithJitter';
const ALLOWED_FILE = 'websocketStabilityGuard.ts';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

describe('reconnectEntryAudit', () => {
  it('has no scheduleWebsocketReconnectWithJitter outside removed guard', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = file.replace(/\\/g, '/');
      if (rel.endsWith(ALLOWED_FILE)) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes(FORBIDDEN)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('executeWebsocketReconnectJitter only referenced from coordinator and guard', () => {
    const allowed = new Set([
      'src/services/websocketStabilityGuard.ts',
      'src/runtime/stability/reconnectCoordinator.ts',
      'src/runtime/stability/reconnectEntryRegistry.ts',
    ]);
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = file.replace(/\\/g, '/').split('/src/')[1];
      const full = `src/${rel}`;
      if (!rel || allowed.has(full)) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes('executeWebsocketReconnectJitter')) offenders.push(full);
    }
    expect(offenders).toEqual([]);
  });
});
