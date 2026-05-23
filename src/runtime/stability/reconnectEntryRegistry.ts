/**
 * Reconnect entry ownership — scheduling mutations only via requestReconnectSchedule.
 * executeWebsocketReconnectJitter is internal execution; never import from services layer.
 */
import type { ReconnectSource } from '../../types/reconnectEntry';

export const RECONNECT_SINGLE_OWNER = 'reconnectCoordinator.requestReconnectSchedule' as const;

/** Effect kinds permitted to trigger reconnect (executor dispatches to coordinator). */
export const RECONNECT_EFFECT_KINDS = [
  'WS_RECONNECT_JITTER',
  'WS_RECONNECT_DEFER',
  'STABILITY_RECONNECT_GUARD',
  'RESUME_WS_RESTORE_SEQUENCE',
] as const;

/** Sources that may call requestReconnectSchedule directly (non-effect paths). */
export const RECONNECT_DIRECT_SOURCES: ReconnectSource[] = [
  'hydration_sequencer',
  'redmi_foreground',
  'redmi_stagger',
  'mobile_soft',
];
