import { defineConfig } from 'vite';
import { macroRegistryPlugin } from './vite-plugin-macro-registry.js';

export default defineConfig({
  plugins: [
    macroRegistryPlugin()
  ],
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
