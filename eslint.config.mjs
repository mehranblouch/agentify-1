import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This repo uses a lot of client-side hydration state (localStorage bootstraps).
      // Disable overly strict rule so lint stays usable.
      "react-hooks/set-state-in-effect": "off",
      // The UI copy intentionally contains quotes/apostrophes.
      "react/no-unescaped-entities": "off",
      // Allow pragmatic any in route handlers / integrations until types are formalized.
      "@typescript-eslint/no-explicit-any": "off",
      // Baileys exports helpers that look like hooks (useMultiFileAuthState).
      // This rule is React-specific and causes false positives in server-only libs.
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    "public/widget.js",
  ]),
]);

export default eslintConfig;
