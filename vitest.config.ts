import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'functions/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
