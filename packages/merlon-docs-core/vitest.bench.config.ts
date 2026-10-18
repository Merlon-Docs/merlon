import { defineConfig } from 'vitest/config';

// Benchmarks: growth-rate checks that run in CI on pull requests, not in `pnpm test`.
export default defineConfig({
  test: {
    include: ['bench/**/*.test.ts'],
    // One file at a time, so benchmarks don't compete with each other for the CPU.
    fileParallelism: false,
    testTimeout: 60_000,
  },
});
