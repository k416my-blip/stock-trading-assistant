export const RUNTIME_KERNEL_VERSION = 1;
export const REAL_TRADING_ENABLED = false as const;

/** When true, telemetry/async paths must not apply runtime knobs (kernel owns dispatch). */
export const RUNTIME_KERNEL_OWNS_POLICY = true as const;
