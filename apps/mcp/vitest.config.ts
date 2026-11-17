import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // vi.spyOn (e.g. muting stderr) is undone after every test.
    restoreMocks: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
