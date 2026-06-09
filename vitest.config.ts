import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/unit/nativeSoak/**/*.test.ts',
      'tests/unit/openAi*.test.ts',
      'tests/unit/forwardValidation*.test.ts',
      'tests/unit/sixEtf*.test.ts',
      'tests/unit/usOperational*.test.ts',
      'tests/unit/case4*.test.ts',
    ],
    setupFiles: ['tests/helpers/setup.ts'],
    testTimeout: 30_000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react-native': path.resolve(__dirname, 'tests/helpers/reactNativeStub.cjs'),
    },
  },
});
