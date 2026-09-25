import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/angrybots/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'planck', test: /node_modules[\\/]planck[\\/]/ },
          ],
        },
      },
    },
  },
});
