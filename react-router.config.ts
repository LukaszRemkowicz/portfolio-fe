import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  ssr: true,
  future: {
    // Required by @cloudflare/vite-plugin.
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
