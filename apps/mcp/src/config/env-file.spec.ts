import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultEnvFiles, loadEnvFile } from './env-file.js';

describe('loadEnvFile', () => {
  let root: string;
  let appFile: string;
  let rootFile: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mcp-env-'));
    mkdirSync(join(root, 'apps/mcp'), { recursive: true });
    appFile = join(root, 'apps/mcp/.env');
    rootFile = join(root, '.env');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const load = (env: Record<string, string | undefined> = {}) => ({
    env,
    path: loadEnvFile(env, [appFile, rootFile]),
  });

  it('loads apps/mcp/.env when only it exists', () => {
    writeFileSync(appFile, 'MCP_API_KEY=rm_app\n');
    expect(load()).toEqual({ path: appFile, env: { MCP_API_KEY: 'rm_app' } });
  });

  it('falls back to the root .env', () => {
    writeFileSync(rootFile, 'API_BASE_URL=http://localhost:3001/api\nMCP_API_KEY=rm_root\n');
    expect(load()).toEqual({
      path: rootFile,
      env: { API_BASE_URL: 'http://localhost:3001/api', MCP_API_KEY: 'rm_root' },
    });
  });

  it('prefers apps/mcp/.env when both exist (the root one is not read)', () => {
    writeFileSync(appFile, 'MCP_API_KEY=rm_app\n');
    writeFileSync(rootFile, 'MCP_API_KEY=rm_root\nAPI_BASE_URL=http://root/api\n');
    expect(load()).toEqual({ path: appFile, env: { MCP_API_KEY: 'rm_app' } });
  });

  it('returns null and leaves env alone when no file exists', () => {
    expect(load({ MCP_API_KEY: 'rm_proc' })).toEqual({
      path: null,
      env: { MCP_API_KEY: 'rm_proc' },
    });
  });

  it('keeps values from the process env; an empty string counts as unset', () => {
    writeFileSync(rootFile, 'MCP_API_KEY=rm_file\nAPI_BASE_URL=http://file/api\n');
    const { env } = load({ MCP_API_KEY: 'rm_proc', API_BASE_URL: '' });
    expect(env).toEqual({ MCP_API_KEY: 'rm_proc', API_BASE_URL: 'http://file/api' });
  });

  it('resolves the default files from the script, not the cwd', () => {
    const [app, repo] = defaultEnvFiles();
    expect(app).toMatch(/apps[/\\]mcp[/\\]\.env$/);
    expect(repo).toBe(join(app, '../../../.env'));
  });
});
