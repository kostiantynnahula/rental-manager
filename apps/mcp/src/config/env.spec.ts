import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('accepts a base URL and an API key', () => {
    const env = { API_BASE_URL: 'http://localhost:3001/api', MCP_API_KEY: 'rm_ab12cd34_secret' };
    expect(loadEnv(env)).toEqual(env);
  });

  it('lists every invalid variable without echoing values', () => {
    const run = () => loadEnv({ API_BASE_URL: 'localhost:3001', MCP_API_KEY: 'sk-secret-value' });
    expect(run).toThrow(/API_BASE_URL: must be an http\(s\):\/\/ URL/);
    expect(run).toThrow(/MCP_API_KEY: must be an API key/);
    expect(run).not.toThrow(/sk-secret-value|localhost:3001/);
  });

  it('rejects missing variables', () => {
    expect(() => loadEnv({})).toThrow(/API_BASE_URL[\s\S]*MCP_API_KEY/);
  });
});
