import { NodeEnv, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  // Every var without a default; fake values that pass validation.
  const required = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5433/test',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    S3_BUCKET: 'test-bucket',
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
  };

  it('applies defaults when vars are missing', () => {
    const env = validateEnv(required);
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3001);
  });

  it('converts PORT from string', () => {
    expect(validateEnv({ ...required, PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => validateEnv({ ...required, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
