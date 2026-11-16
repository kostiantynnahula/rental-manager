import type { Logger } from '@nestjs/common';
import type { Context } from 'grammy';
import { allowlist } from './allowlist.middleware.js';

const OWNER = 111;

function run(from: { id: number } | undefined) {
  const logger = { warn: vi.fn() };
  const ctx = { from, reply: vi.fn() };
  const next = vi.fn(() => Promise.resolve());
  const middleware = allowlist(new Set([OWNER]), logger as unknown as Logger);
  return { done: middleware(ctx as unknown as Context, next), ctx, next, logger };
}

describe('allowlist', () => {
  it('passes an allowed user on', async () => {
    const { done, next, logger } = run({ id: OWNER });
    await done;
    expect(next).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('drops a stranger without a reply, logging only the id', async () => {
    const { done, next, ctx, logger } = run({ id: 999 });
    await done;
    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Ignored update from user 999');
  });

  it('drops an update without a sender', async () => {
    const { done, next, ctx, logger } = run(undefined);
    await done;
    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Ignored update from user unknown');
  });
});
