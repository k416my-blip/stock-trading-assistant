import { useEffect } from 'react';
import { noteLongSessionJsThreadSample } from '../services/longSessionRuntimeSoak';
import { noteEventLoopLag } from '../services/runtimeFrameTelemetry';

export function useJsThreadTelemetry(label: string, intervalMs = 1_000): void {
  useEffect(() => {
    let expected = Date.now() + intervalMs;
    const timer = setInterval(() => {
      const now = Date.now();
      const lag = now - expected;
      expected = now + intervalMs;
      noteEventLoopLag(label, lag);
      noteLongSessionJsThreadSample(label, lag);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, label]);
}
