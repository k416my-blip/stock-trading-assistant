import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['scripts/rakuten-import-real-world-validation.vitest.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    testTimeout: 180_000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react-native': path.resolve(__dirname, 'tests/helpers/reactNativeStub.cjs'),
    },
  },
});
