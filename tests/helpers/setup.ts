import { beforeEach, vi } from 'vitest';
import { clearMockAsyncStorage } from './asyncStorageMock';

vi.mock('@react-native-async-storage/async-storage', async () => {
  const { createAsyncStorageMock } = await import('./asyncStorageMock');
  return { default: createAsyncStorageMock() };
});

beforeEach(() => {
  clearMockAsyncStorage();
  process.env.NODE_ENV = 'test';
});
