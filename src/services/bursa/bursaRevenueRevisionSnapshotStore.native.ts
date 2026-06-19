/**
 * Phase23 — Revenue snapshot store (React Native · in-memory only)
 */
import {
  computeRevisionPctFromSnapshots as computeFromList,
  findRevenueEstimateSnapshotNearDaysAgo as findNearDaysAgo,
  mergeSnapshotRecord,
  type RevenueEstimateSnapshot,
} from './bursaRevenueRevisionSnapshotStore.shared';

export type { RevenueEstimateSnapshot };

let memoryStore: RevenueEstimateSnapshot[] = [];

export function configureRevenueRevisionSnapshotPath(_path: string | null): void {
  // RN has no filesystem snapshot path — in-memory only
}

export function resetRevenueRevisionSnapshotStoreForTest(): void {
  memoryStore = [];
}

export function configureRevenueRevisionSnapshotPathForTest(_path: string): void {
  memoryStore = [];
}

export function listRevenueEstimateSnapshots(): RevenueEstimateSnapshot[] {
  return [...memoryStore];
}

export function recordRevenueEstimateSnapshot(input: RevenueEstimateSnapshot): void {
  if (!Number.isFinite(input.revenueEstimate) || input.revenueEstimate === 0) return;
  memoryStore = mergeSnapshotRecord(memoryStore, input);
}

export function findRevenueEstimateSnapshotNearDaysAgo(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  daysAgo: number;
  toleranceDays?: number;
}): RevenueEstimateSnapshot | null {
  return findNearDaysAgo(listRevenueEstimateSnapshots(), input);
}

export function computeRevisionPctFromSnapshots(input: {
  stockCode: string;
  fiscalPeriodEnd: string;
  currentRevenue: number;
  daysAgo?: number;
}): { revision30d: number | null; priorSnapshot: RevenueEstimateSnapshot | null } {
  return computeFromList(listRevenueEstimateSnapshots(), input);
}
