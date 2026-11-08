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

export default defineConfig((): UserConfig => {
  const appEnvironment =
    process.env.ENVIRONMENT || process.env.VITE_ENVIRONMENT || 'development';
  const disablePwaEnvironments = ['development', 'dev', 'local'];
  const enablePwa = !disablePwaEnvironments.includes(appEnvironment);

  return {
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
      hmr: {
        clientPort: process.env.VITE_ENVIRONMENT === 'stage' ? 8443 : 443,
        protocol: 'wss',
        host:
          process.env.VITE_ENVIRONMENT === 'stage'
            ? process.env.SITE_DOMAIN || 'stage.portfolio.local'
            : 'portfolio.local',
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.FRONTEND_PORT) || 8080,
    },
    environments: {
      // Client sourcemaps stay on; the worker bundle ships none.
      client: { build: { sourcemap: true } },
      ssr: { build: { sourcemap: false } },
    },
    build: {
      target: 'es2022',
      // vite-plugin-pwa reads the top-level outDir; keep it on the RR client output.
      outDir: 'build/client',
    },
  };
});
