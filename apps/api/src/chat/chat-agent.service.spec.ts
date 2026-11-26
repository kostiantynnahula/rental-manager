import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { ConditionPhotosService } from '../condition-photos/condition-photos.service.js';
import type { LeasesService } from '../leases/leases.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ChatAgentService } from './chat-agent.service.js';
import type { SendChatMessageDto } from './dto/send-chat-message.dto.js';

// No network: the model, the agent and the LangChain -> UI stream adapter are replaced; the SSE pipe is the real one.
vi.mock('./agent/chat-model.js', () => ({ chatModel: () => ({}) }));
vi.mock('./agent/chat-agent.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./agent/chat-agent.js')>()),
  buildChatAgent: () => ({ stream: async () => ({}) }),
}));
vi.mock('@ai-sdk/langchain', () => ({
  toBaseMessages: async () => [],
  toUIMessageStream: () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'start' });
        controller.enqueue({ type: 'text-start', id: 't1' });
        controller.enqueue({ type: 'text-delta', id: 't1', delta: 'Hello' });
        controller.enqueue({ type: 'text-end', id: 't1' });
        controller.close();
      },
    }),
}));

function buildService(): ChatAgentService {
  const prisma = {
    chat: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'c1',
        title: null,
        apartmentId: 'a1',
        apartment: { name: 'Flat' },
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    chatMessage: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi
        .fn()
        .mockResolvedValue([{ role: 'USER', parts: [{ type: 'text', text: 'Hi' }] }]),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const config = {
    get: (key: string) => ({ CHAT_HISTORY_LIMIT: 20, CHAT_MAX_TOOL_CALLS: 5 })[key],
  } as unknown as ConfigService<never, true>;
  return new ChatAgentService(
    prisma as unknown as PrismaService,
    {} as ConditionPhotosService,
    {} as LeasesService,
    config,
  );
}

describe('ChatAgentService.send', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('streams the answer as SSE with Cache-Control: no-cache, no-transform', async () => {
    const service = buildService();
    const dto = {
      message: { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
    } as unknown as SendChatMessageDto;
    server = createServer((_req, res) => {
      void service.send('c1', dto, res as unknown as Response);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST' });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-cache, no-transform');
    expect(body).toContain('Hello');
  });
});
