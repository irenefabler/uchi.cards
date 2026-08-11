import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '@uchi/content-0-4-eslint-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configured = baseConfig.map((entry) => ({
  ...entry,
  languageOptions: {
    ...entry.languageOptions,
    parserOptions: {
      ...entry.languageOptions?.parserOptions,
      project: path.join(__dirname, 'tsconfig.eslint.json'),
      tsconfigRootDir: __dirname
    }
  },
  settings: {
    ...(entry.settings ?? {}),
    'import-x/resolver': {
      typescript: {
        project: path.join(__dirname, 'tsconfig.eslint.json'),
        alwaysTryTypes: true
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
}));

export default [
  // артефакты сборки, зависимости и вендорные конфиг-пакеты не линтим
  { ignores: ['dist/**', 'node_modules/**', 'vendor/**'] },
  ...configured
];
