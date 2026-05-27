import { useEffect, useRef } from 'react';
import { noteLongSessionRenderDrift } from '../services/longSessionRuntimeSoak';
import { noteRenderCommit } from '../services/mobileStabilityWatchdog';
import { noteRenderTiming } from '../services/runtimeFrameTelemetry';

export function useRenderWatchdog(label: string): void {
  const renderStartedAt = useRef(Date.now());
  renderStartedAt.current = Date.now();

  useEffect(() => {
    const elapsed = Date.now() - renderStartedAt.current;
    noteRenderCommit(label, elapsed);
    noteRenderTiming(label, elapsed);
    noteLongSessionRenderDrift(label, elapsed);
  });
}
