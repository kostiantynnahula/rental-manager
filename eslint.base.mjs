// Shared ESLint flat config. Apps spread this into their own eslint.config.mjs.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export const sharedIgnores = {
  ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/generated/**'],
};

// Project rules on top of the recommended presets. Exported separately so apps that bring
// their own typescript-eslint setup (Next) can reuse them without registering the plugin twice.
export const sharedRules = {
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};

export default tseslint.config(
  sharedIgnores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sharedRules,
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
);
