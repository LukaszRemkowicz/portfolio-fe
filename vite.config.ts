import { defineConfig } from 'vite';
import type { Plugin, UserConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { createPwaOptions } from './src/utils/pwaBuildOptions';

/**
 * vite-plugin-pwa for the client environment only. Its `ssr.noExternal` config
 * hook breaks Vite's merge with the Cloudflare/RR worker environment config.
 */
function pwaClientOnly(): Plugin[] {
  return VitePWA(
    createPwaOptions(
      process.env.ENVIRONMENT || process.env.VITE_ENVIRONMENT || 'development',
      process.env.PROJECT_OWNER
    )
  ).map(plugin => ({
    ...plugin,
    config: undefined,
    applyToEnvironment: env => env.name === 'client',
  }));
}

/**
 * react-zoom-pan-pinch injects its CSS as a <style> at import time with no
 * nonce option, which the enforced CSP (style-src nonce) blocks. Give that
 * element the page's nonce, read from the nonced bootstrap <script>.
 */
function zoomPanPinchStyleNonce(): Plugin {
  const needle = "style.type = 'text/css';";
  return {
    name: 'zoom-pan-pinch-style-nonce',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('react-zoom-pan-pinch') || !code.includes(needle))
        return null;
      return code.replace(
        needle,
        needle +
          " var n = document.querySelector('script[nonce]'); if (n && n.nonce) { style.setAttribute('nonce', n.nonce); }"
      );
    },
  };
}

export default defineConfig((): UserConfig => {
  const appEnvironment =
    process.env.ENVIRONMENT || process.env.VITE_ENVIRONMENT || 'development';
  const disablePwaEnvironments = ['development', 'dev', 'local'];
  const enablePwa = !disablePwaEnvironments.includes(appEnvironment);

  return {
    // Docker dev (docker-compose.yml): dot-free dep cache directory, kept
    // inside the node_modules volume.
    cacheDir: process.env.VITE_CACHE_DIR || undefined,
    esbuild: {
      target: 'es2022',
    },
    define: {
      'Array.from': 'Array.from',
      __PROJECT_OWNER__: JSON.stringify(
        process.env.PROJECT_OWNER || 'Portfolio Owner'
      ),
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      reactRouter(),
      zoomPanPinchStyleNonce(),
      enablePwa && pwaClientOnly(),
    ].filter(Boolean),
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.FRONTEND_PORT) || 8080,
      allowedHosts: process.env.ALLOWED_HOSTS
        ? process.env.ALLOWED_HOSTS.split(',').map(h => h.trim())
        : ['portfolio.local', 'localhost'],
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.FRONTEND_PORT) || 8080,
    },
    environments: {
      // No public sourcemaps: nothing (e.g. Sentry) consumes them.
      client: { build: { sourcemap: false } },
      ssr: { build: { sourcemap: false } },
    },
    build: {
      target: 'es2022',
      // vite-plugin-pwa reads the top-level outDir; keep it on the RR client output.
      outDir: 'build/client',
    },
  };
});
