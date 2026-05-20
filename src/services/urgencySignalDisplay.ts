import { URGENCY_SIGNAL_LEVEL_LABEL, type UrgencySignal } from '../types/urgencySignal';
import { formatRemainingMinutesJa } from './tradeQueueStatusResolver';

export type HeaderSignalDisplay = {
  levelLabel: string;
  titleLine: string;
  actionLine: string;
  remainingLine: string;
};

export function buildHeaderSignalDisplay(
  signal: UrgencySignal,
  nowMs: number = Date.now(),
): HeaderSignalDisplay {
  const levelLabel = `[${URGENCY_SIGNAL_LEVEL_LABEL[signal.level]}]`;
  const titleLine =
    signal.ticker && signal.displayName
      ? `${signal.ticker} ${signal.displayName}`
      : signal.ticker ?? signal.displayName ?? signal.actionLabel;
  const actionLine = signal.ticker ? signal.actionLabel : signal.reason.slice(0, 40);
  const remainingLine = formatRemainingMinutesJa(signal.responseDeadlineAt, nowMs);

  return { levelLabel, titleLine, actionLine, remainingLine };
}
