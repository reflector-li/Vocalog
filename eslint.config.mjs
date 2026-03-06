// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["src/transcription.ts"],
    rules: {
      // Allow fetch for multipart file uploads (requestUrl doesn't support FormData)
      "no-restricted-globals": "off",
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

