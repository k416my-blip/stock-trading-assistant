import { isDev } from '../../utils/isDev';

type LogEntry = { at: string; level: 'debug' | 'info' | 'warn' | 'error'; message: string };

const buffer: LogEntry[] = [];
const MAX = 120;

export function productionDebugLog(
  message: string,
  level: LogEntry['level'] = 'debug',
): void {
  buffer.push({ at: new Date().toISOString(), level, message });
  if (buffer.length > MAX) buffer.shift();
  if (!isDev && level === 'debug') return;
  if (level === 'error') {
    console.error(`[prod] ${message}`);
  } else if (level === 'warn') {
    console.warn(`[prod] ${message}`);
  } else if (isDev) {
    console.log(`[prod] ${message}`);
  }
}

export function getDebugLogEntries(): LogEntry[] {
  return [...buffer];
}

export function getDebugLogCount(): number {
  return buffer.length;
}

export function resetDebugConsoleForTest(): void {
  buffer.length = 0;
}
