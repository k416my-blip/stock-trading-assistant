import { isDev } from './isDev';

type LogPayload = Record<string, unknown>;

function briefPayload(payload: LogPayload): LogPayload {
  const out: LogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.length > 120) {
      out[key] = `${value.slice(0, 120)}…`;
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = `array(${value.length})`;
      continue;
    }
    if (typeof value === 'object') {
      out[key] = 'object';
      continue;
    }
    out[key] = String(value);
  }
  return out;
}

/** 開発時は詳細、本番は要約のみ */
export function logMarketData(tag: string, payload: LogPayload): void {
  if (isDev) {
    console.log(tag, payload);
    return;
  }
  console.log(tag, briefPayload(payload));
}

export function logMarketDataInfo(tag: string, message: string, payload?: LogPayload): void {
  if (!payload) {
    console.log(tag, message);
    return;
  }
  logMarketData(tag, { message, ...payload });
}

/** 成功系 — 本番でも1行 */
export function logMarketDataSuccess(tag: string, summary: string): void {
  console.log(tag, summary);
}
