export class TimeoutError extends Error {
  constructor(message = '操作がタイムアウトしました') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Promise をタイムアウトで打ち切る */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = '操作がタイムアウトしました',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function createRefreshDeadline(timeoutMs: number): {
  isExpired: () => boolean;
  remainingMs: () => number;
} {
  const deadline = Date.now() + timeoutMs;
  return {
    isExpired: () => Date.now() >= deadline,
    remainingMs: () => Math.max(0, deadline - Date.now()),
  };
}
