// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  {
    ignores: [
      "main.js",
      "node_modules/**",
      "package-lock.json",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: globals.browser,
    },
    rules: {
      // Optional: Override or add rules
      "obsidianmd/sample-names": "off",
    },
  },
]);
