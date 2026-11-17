import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureStderr } from './test/mcp-client.js';
import { log, setLogFile } from './logger.js';

describe('log file', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-log-'));
  });
  afterEach(() => {
    setLogFile(undefined);
    rmSync(dir, { recursive: true, force: true });
  });

  it('appends the stderr lines, creating a missing directory under the base', () => {
    const stderr = captureStderr();
    expect(setLogFile('logs/mcp.log', dir)).toBe(join(dir, 'logs/mcp.log'));
    log('first');
    log('second');
    expect(readFileSync(join(dir, 'logs/mcp.log'), 'utf8')).toBe(
      '[rental-mcp] first\n[rental-mcp] second\n',
    );
    expect(stderr()).toBe('[rental-mcp] first\n[rental-mcp] second\n');
  });

  it('keeps an absolute path as is', () => {
    captureStderr();
    const file = join(dir, 'abs.log');
    expect(setLogFile(file, '/elsewhere')).toBe(file);
  });

  it('logs to stderr only when unset or empty', () => {
    captureStderr();
    expect(setLogFile(undefined, dir)).toBeUndefined();
    expect(setLogFile('', dir)).toBeUndefined();
  });

  it('disables the file after a failed write and keeps logging to stderr', () => {
    const stderr = captureStderr();
    const file = join(dir, 'mcp.log');
    setLogFile(file, dir);
    log('kept');
    // The file turns into a directory: the next append fails (EISDIR).
    rmSync(file);
    mkdirSync(file);
    log('lost');
    log('after');
    expect(stderr()).toMatch(/lost\n\[rental-mcp\] log file disabled: .*\n\[rental-mcp\] after\n$/);
  });
});
