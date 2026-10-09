// @ts-check
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';


/** @type {import('vite').UserConfigFn} */
export default defineConfig(({ mode }) => {
  const envs = Object.assign(process.env, loadEnv(mode, process.cwd()));

  return {
    base: envs.VITE_BASE_PATH,
    plugins: [
      legacy(),
      react(),
      svgr(),
      tsconfigPaths(),
    ],
    server: {
      port: 3000,
      proxy: createProxiesIfNeed(envs, mode),
    },
    build: {
      assetsInlineLimit: 0,
      target: 'esnext',
    },
  };
});


function createProxiesIfNeed(envs, mode) {
  const proxyPaths = Object.entries(envs).filter(([key]) => {
    return key.startsWith('VITE_PROXY_PATH');
  });

  /** @type {Record<string, string | import('vite').ProxyOptions>} */
  const proxies = {};

  proxyPaths.forEach(([_, url]) => {
    proxies[url] = {
      target: envs.VITE_PROXY_URL,
      changeOrigin: true,
      // Local development identity only. Production still uses the trusted gateway.
      ...(mode === 'development' && url === '/api/v1' &&
        /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(envs.VITE_PROXY_URL || '') &&
        /^[1-9]\d*$/.test(envs.VITE_DEV_USER_ID || '')
        ? { headers: { 'X-User-Id': envs.VITE_DEV_USER_ID } } : {}),
    }
  })

  return proxies;
}
