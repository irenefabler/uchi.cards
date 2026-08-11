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
      proxy: createProxiesIfNeed(envs),
    },
    build: {
      assetsInlineLimit: 0,
      target: 'esnext',
    },
  };
});


function createProxiesIfNeed(envs) {
  const proxyPaths = Object.entries(envs).filter(([key]) => {
    return key.startsWith('VITE_PROXY_PATH');
  });

  /** @type {Record<string, string | import('vite').ProxyOptions>} */
  const proxies = {};

  proxyPaths.forEach(([_, url]) => {
    proxies[url] = {
      target: envs.VITE_PROXY_URL,
      changeOrigin: true,
    }
  })

  return proxies;
}
