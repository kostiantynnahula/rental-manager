import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from '../../eslint.base.mjs';

export default tseslint.config(...base, {
  languageOptions: {
    globals: { ...globals.node, ...globals.vitest },
    parserOptions: {
      projectService: { allowDefaultProject: ['*.mjs', 'scripts/*.mjs'] },
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    // Same intent as the oxlint config Nest generated.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
  },
});
