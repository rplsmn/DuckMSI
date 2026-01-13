import { defineConfig } from 'vite';

export default defineConfig({
  base: '/DuckMSI/',
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'esnext'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
