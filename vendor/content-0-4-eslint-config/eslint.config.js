import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importPlugin, { flatConfigs } from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import unicornPlugin from "eslint-plugin-unicorn";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  flatConfigs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      "unused-imports": unusedImportsPlugin,
      import: fixupPluginRules(importPlugin),
      "react-hooks": fixupPluginRules(reactHooks),
      unicorn: unicornPlugin,
    },
    languageOptions: { globals: globals.browser },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react/react-in-jsx-scope": "off",

      "react/self-closing-comp": [
        "error",
        {
          component: true,
          html: true,
        },
      ],
      "import/named": "off",
      "import/first": "warn",
      "import/newline-after-import": "warn",
      "import/no-duplicates": "error",
      "import/no-named-as-default-member": "off",
      "import/no-named-as-default": "off",
      "import/order": [
        1,
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "react", group: "builtin", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "unused-imports/no-unused-imports": "error",

      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": [
        "warn",
        {
          endOfLine: "auto",
        },
      ],
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },
  prettierRecommended,
]);
