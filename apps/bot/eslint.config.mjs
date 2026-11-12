import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from '../../eslint.base.mjs';

export default tseslint.config(...base, {
  languageOptions: {
    globals: { ...globals.node },
    parserOptions: {
      projectService: { allowDefaultProject: ['*.mjs', 'scripts/*.mjs'] },
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
  },
});
