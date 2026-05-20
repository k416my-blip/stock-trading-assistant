import type { MarketDataErrorKind } from '../types/marketData';

export type QuoteProbeAbortReason = 'timeout' | 'offline' | 'auth' | 'rate_limit';

export type ProbeNotedError = {
  kind: MarketDataErrorKind;
  message: string;
  rawMessage: string;
  httpStatus?: number;
};

const OFFLINE_PATTERN =
  /failed to fetch|network request failed|internet connection|network error|offline|enotfound|econnrefused/i;

/** 一括更新中のシンボル試行を打ち切る（API・電池節約） */
export class QuoteProbeSession {
  private consecutiveTimeouts = 0;
  private aborted = false;
  private abortReason?: QuoteProbeAbortReason;
  private abortError?: ProbeNotedError;

  shouldAbort(): boolean {
    return this.aborted;
  }

  getAbortError(): ProbeNotedError {
    return (
      this.abortError ?? {
        kind: 'unknown',
        message: '株価の取得を中断しました',
        rawMessage: 'probe aborted',
      }
    );
  }

  noteFailure(err: ProbeNotedError): void {
    if (this.aborted) return;

    if (err.kind === 'api_key') {
      this.abort('auth', err);
      return;
    }

    if (err.kind === 'rate_limit') {
      /* バッチ全体は中断せずキュー側バックオフで継続 */
      return;
    }

    if (err.kind === 'network_timeout') {
      if (OFFLINE_PATTERN.test(err.rawMessage)) {
        this.abort('offline', err);
        return;
      }
      this.consecutiveTimeouts += 1;
      if (this.consecutiveTimeouts >= 2) {
        this.abort('timeout', err);
      }
    }
  }

  private abort(reason: QuoteProbeAbortReason, err: ProbeNotedError): void {
    this.aborted = true;
    this.abortReason = reason;
    this.abortError = err;
  }

  resetForTests(): void {
    this.consecutiveTimeouts = 0;
    this.aborted = false;
    this.abortReason = undefined;
    this.abortError = undefined;
  }
}

export function probeErrorFromMarketData(err: {
  kind: MarketDataErrorKind;
  message: string;
  rawMessage: string;
  httpStatus?: number;
}): ProbeNotedError {
  return {
    kind: err.kind,
    message: err.message,
    rawMessage: err.rawMessage,
    httpStatus: err.httpStatus,
  };
}

export function isFatalProbeErrorKind(kind: MarketDataErrorKind): boolean {
  return kind === 'api_key' || kind === 'rate_limit';
}
