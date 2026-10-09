import tailwindcss from '@tailwindcss/vite';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from '@uchi/content-0-4-vite-config';

export default defineConfig((config) => {
  const base = baseConfig(config);
  return mergeConfig(base, {
    plugins: [tailwindcss()]
  });
});
