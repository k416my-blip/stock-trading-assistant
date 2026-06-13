/**
 * Phase12.5 logcat monitor parsing — heartbeat / price_update from live log tail.
 */
import fs from 'node:fs';

export const DEFAULT_LOGCAT_TAIL_BYTES = 65536;

const HEARTBEAT_LINE_RE =
  /(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*(?:ReactNativeJS:)?.*12H-MONITOR.*heartbeat/i;
const PRICE_UPDATE_RE = /price_update[^\n]*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;

export function decodeLogcatBuffer(buf) {
  if (!buf?.length) return '';
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le');
  }
  if (buf.length >= 4 && buf[1] === 0 && buf[3] === 0 && buf[5] === 0) {
    return buf.toString('utf16le');
  }
  return buf.toString('utf8');
}

export function readLogcatTailBytes(filePath, maxBytes = DEFAULT_LOGCAT_TAIL_BYTES, fsImpl = fs) {
  if (!fsImpl.existsSync(filePath)) return '';
  const stat = fsImpl.statSync(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const fd = fsImpl.openSync(filePath, 'r');
  const buf = Buffer.alloc(stat.size - start);
  fsImpl.readSync(fd, buf, 0, buf.length, start);
  fsImpl.closeSync(fd);
  return decodeLogcatBuffer(buf);
}

export function extractLastMonitor(tail, kind) {
  if (!tail) return 'none';
  const re = kind === 'heartbeat' ? HEARTBEAT_LINE_RE : PRICE_UPDATE_RE;
  const matches = [...tail.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))];
  const m = matches.pop();
  if (!m) return 'none';
  return m[1];
}
