/** Single-owner reconnect entry tags — all scheduling must pass through reconnectCoordinator. */
export type ReconnectSource =
  | 'kernel_policy'
  | 'kernel_defer'
  | 'stability_guard'
  | 'resume_coordinator'
  | 'hydration_sequencer'
  | 'redmi_foreground'
  | 'redmi_stagger'
  | 'mobile_soft';

export type ReconnectScheduleRequest = {
  baseMs: number;
  maxMs: number;
  reasonJa: string;
  source: ReconnectSource;
};
