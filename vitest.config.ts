import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/** Unit tests: fast, no database, colocated with the code (`src/**\/*.spec.ts`). */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test/setup/silence-logs.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.dto.ts', 'src/**/*.module.ts', 'src/main.ts'],
    },
  },
});
