import type { Logger } from '@nestjs/common';
import type { Context, MiddlewareFn } from 'grammy';

// First middleware: updates from anyone not on the list (or without a sender) stop here, with no reply —
// a stranger shouldn't even learn that the bot works. Only the id is logged.
export function allowlist(allowed: ReadonlySet<number>, logger: Logger): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId === undefined || !allowed.has(userId)) {
      logger.warn(`Ignored update from user ${userId ?? 'unknown'}`);
      return;
    }
    await next();
  };
}
