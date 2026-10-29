import { NodeEnv, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('applies defaults when vars are missing', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3001);
  });

  it('converts PORT from string', () => {
    expect(validateEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
