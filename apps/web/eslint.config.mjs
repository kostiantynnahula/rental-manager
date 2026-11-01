import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import { sharedIgnores, sharedRules } from '../../eslint.base.mjs';

// Next's presets already register typescript-eslint (its own copy), so we take only our
// shared ignores/rules from the base instead of spreading it — avoids "Cannot redefine plugin".
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  sharedIgnores,
  sharedRules,
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'lib/api/schema.d.ts']),
]);
