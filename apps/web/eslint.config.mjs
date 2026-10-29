import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import base from '../../eslint.base.mjs';

export default defineConfig([
  ...base,
  ...nextVitals,
  ...nextTs,
  // Re-applied last because the Next configs come after the base.
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
