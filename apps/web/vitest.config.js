import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for the products-and-sales-improvements feature
 * (and the rest of the web app going forward).
 *
 * - Default environment is `node` so API/property tests under
 *   `tests/properties`, `tests/integration`, `tests/unit`, and
 *   `tests/smoke` run without jsdom overhead.
 * - Component tests under `tests/components` automatically run under
 *   jsdom via `environmentMatchGlobs`.
 * - The `@/` alias mirrors `jsconfig.json` so route handlers and hooks
 *   resolve the same way under test as in Next.js.
 */
export default defineConfig({
  // Next.js App Router permits JSX inside `.js` files. The React plugin's
  // include glob handles transformation, but Vite's import-analysis step
  // still parses with esbuild's default JS loader, which chokes on JSX.
  // Force the JSX loader for all source `.js` files so importing pages /
  // components written as `.js` works under Vitest.
  plugins: [react({ include: /\.(js|jsx|mjs|ts|tsx)$/ })],
  esbuild: {
    loader: 'jsx',
    include: [/\.(js|jsx|mjs|ts|tsx)$/],
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
    ],
    include: [
      'tests/**/*.{test,spec,pbt.test}.{js,jsx,mjs}',
      'src/**/*.{test,spec}.{js,jsx,mjs}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'dist/**',
    ],
    // Property-based tests can take a moment; allow generous timeouts
    // without being so loose that hangs slip through.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
