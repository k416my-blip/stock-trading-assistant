import AsyncStorage from '@react-native-async-storage/async-storage';
import { LONG_SOAK_RECORD_MAX, SOAK_MODE_MIN_SESSION_MINUTES } from '../../constants/nativeRuntimeBridge';
import type { LongSoakRecord } from '../../types/nativeRuntimeBridge';

const SOAK_STORAGE_KEY = '@sta/long_soak_records_v1';

const records: LongSoakRecord[] = [];
let aiSuppressionAccumMs = 0;
let aiSuppressionStartedAt: number | null = null;

export function resetLongSoakTestingForTest(): void {
  records.length = 0;
  aiSuppressionAccumMs = 0;
  aiSuppressionStartedAt = null;
}

export function isSoakModeActive(sessionMinutes: number): boolean {
  return sessionMinutes >= SOAK_MODE_MIN_SESSION_MINUTES;
}

export function noteAiSuppressionActive(active: boolean): void {
  const now = Date.now();
  if (active) {
    if (aiSuppressionStartedAt == null) aiSuppressionStartedAt = now;
  } else if (aiSuppressionStartedAt != null) {
    aiSuppressionAccumMs += now - aiSuppressionStartedAt;
    aiSuppressionStartedAt = null;
  }
}

export function recordSoakSample(input: {
  orchestratorState: string;
  memoryMb: number;
  reconnectCount: number;
  fps: number;
  queueDepth: number;
  survivalActivations: number;
}): void {
  records.push({
    at: new Date().toISOString(),
    orchestratorState: input.orchestratorState,
    memoryMb: input.memoryMb,
    reconnectCount: input.reconnectCount,
    fps: input.fps,
    queueDepth: input.queueDepth,
    aiSuppressionMs: aiSuppressionAccumMs,
    survivalActivations: input.survivalActivations,
  });
  if (records.length > LONG_SOAK_RECORD_MAX) {
    records.shift();
  }
}

export function exportSoakCsv(): string {
  const header =
    'at,orchestratorState,memoryMb,reconnectCount,fps,queueDepth,aiSuppressionMs,survivalActivations';
  const rows = records.map(
    (r) =>
      `${r.at},${r.orchestratorState},${r.memoryMb},${r.reconnectCount},${r.fps},${r.queueDepth},${r.aiSuppressionMs},${r.survivalActivations}`,
  );
  return [header, ...rows].join('\n');
}

export async function persistSoakRecords(): Promise<void> {
  await AsyncStorage.setItem(
    SOAK_STORAGE_KEY,
    JSON.stringify({ version: 1, records: records.slice(-500) }),
  );
}

export async function loadSoakRecords(): Promise<LongSoakRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(SOAK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { records?: LongSoakRecord[] };
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

export function getSoakRecordCount(): number {
  return records.length;
}
