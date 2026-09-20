import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/physics/**/*.test.ts',
      'tests/perf/**/*.test.ts',
    ],
    passWithNoTests: true,
  },
});
