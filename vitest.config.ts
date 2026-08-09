import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { provider: 'v8', reporter: ['text', 'json', 'html'] },
    include: ['packages/*/test/**/*.test.ts'],
    testTimeout: 15_000,
  },
});
