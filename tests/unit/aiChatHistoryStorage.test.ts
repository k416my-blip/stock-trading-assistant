import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAiChatHistory, saveAiChatHistory } from '../../src/services/aiChatHistoryStorage';
import { createUserChatMessage } from '../../src/services/chatMessageFactory';
import { getInitialAiChatMessages } from '../../src/data/mockAiChat';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('aiChatHistoryStorage', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
  });

  it('reload keeps persisted createdAt unchanged', async () => {
    const user = createUserChatMessage('offline ping');
    const stored = [getInitialAiChatMessages()[0], user];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(stored));

    const loaded = await loadAiChatHistory();
    const reloaded = loaded.find((m) => m.id === user.id);
    expect(reloaded?.createdAt).toBe(user.createdAt);
    expect(reloaded?.sortKey).toBe(user.sortKey);
  });

  it('save persists ISO timestamps for export', async () => {
    const user = createUserChatMessage('audit row');
    await saveAiChatHistory([user]);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const payload = vi.mocked(AsyncStorage.setItem).mock.calls[0][1] as string;
    const parsed = JSON.parse(payload) as { createdAt: string }[];
    expect(parsed[0].createdAt).toBe(user.createdAt);
    expect(parsed[0].createdAt).toMatch(/Z$/);
  });
});
