const store = new Map<string, string>();

export function createAsyncStorageMock() {
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
    multiGet: async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null] as [string, string | null]),
    multiSet: async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
    clear: async () => store.clear(),
    getAllKeys: async () => [...store.keys()],
  };
}

export function clearMockAsyncStorage(): void {
  store.clear();
}

export function getMockStorageSnapshot(): Record<string, string> {
  return Object.fromEntries(store.entries());
}

export function seedMockStorage(entries: Record<string, string>): void {
  clearMockAsyncStorage();
  for (const [k, v] of Object.entries(entries)) {
    store.set(k, v);
  }
}
