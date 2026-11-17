import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from '../../eslint.base.mjs';

export default tseslint.config(
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: {
        projectService: { allowDefaultProject: ['*.mjs', 'scripts/*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      // stdout carries only the MCP protocol: log through src/logger.ts (stderr).
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    // Build scripts print to the terminal, not to an MCP client.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
);
