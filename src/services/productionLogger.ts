import { isDev } from '../utils/isDev';
import { secureLog, secureWarn, secureError } from './secureLogger';

/** 開発時のみ verbose。本番では debug 系は無出力。 */
export function verboseLog(message: string, ...args: unknown[]): void {
  if (!isDev) return;
  secureLog(message, ...args);
}

export function verboseWarn(message: string, ...args: unknown[]): void {
  if (!isDev) return;
  secureWarn(message, ...args);
}

export function logInfo(message: string, ...args: unknown[]): void {
  secureWarn(message, ...args);
}

export function logError(message: string, ...args: unknown[]): void {
  secureError(message, ...args);
}
