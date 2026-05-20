import { isDev } from '../utils/isDev';
import { redactSecretsInString } from '../utils/secretMask';

const SENSITIVE_KEYS = new Set([
  'apikey',
  'apiKey',
  'authorization',
  'token',
  'password',
  'secret',
  'portfolio',
  'practice',
  'entries',
  'journal',
  'state',
]);

function redactValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lower)) {
    if (typeof value === 'string') return redactSecretsInString(value);
    if (Array.isArray(value)) return `[redacted:${value.length}]`;
    if (value && typeof value === 'object') return '[redacted:object]';
  }
  if (typeof value === 'string') {
    return redactSecretsInString(value);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') return redactSecretsInString(arg);
    if (arg && typeof arg === 'object') return redactObject(arg as Record<string, unknown>);
    return arg;
  });
}

export function secureLog(message: string, ...args: unknown[]): void {
  if (!isDev) return;
  console.log(redactSecretsInString(message), ...formatArgs(args));
}

export function secureWarn(message: string, ...args: unknown[]): void {
  console.warn(redactSecretsInString(message), ...formatArgs(args));
}

export function secureError(message: string, ...args: unknown[]): void {
  console.error(redactSecretsInString(message), ...formatArgs(args));
}
