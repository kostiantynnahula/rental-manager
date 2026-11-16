import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type { Env } from '../config/env.validation.js';
import { meter } from '../test/builders.js';
import { ExtractionNotConfiguredError } from './errors/extraction-not-configured.error.js';
import { describeCandidates } from './helpers/describe-candidates.js';
import type { Extraction } from './interfaces/extraction.interface.js';
import { PhotoExtractorService } from './photo-extractor.service.js';

// The model is never called: ChatAnthropic is a fake recording what the service gives it.
const model = vi.hoisted(() => {
  const state = {
    options: [] as unknown[],
    raw: { readings: [], photoIssues: [] } as unknown,
    invoke: vi.fn(),
    withStructuredOutput: vi.fn(),
  };
  state.invoke.mockImplementation(() => Promise.resolve(state.raw));
  state.withStructuredOutput.mockImplementation(() => ({ invoke: state.invoke }));
  return state;
});

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: class {
    withStructuredOutput = model.withStructuredOutput;
    constructor(options: unknown) {
      model.options.push(options);
    }
  },
}));

const ENV = {
  EXTRACTION_PROVIDER: 'anthropic',
  EXTRACTION_MODEL: 'claude-haiku-5-5',
  EXTRACTION_EFFORT: 'low',
  ANTHROPIC_API_KEY: 'sk-ant-test',
};

function extractor(env: Record<string, string | undefined> = ENV) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService<Env, true>;
  return new PhotoExtractorService(config);
}

const meters = [meter({ id: 'm1', serialNumber: '02006847' })];
let photo: Buffer;

beforeAll(async () => {
  photo = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#888' } })
    .png()
    .toBuffer();
});

beforeEach(() => {
  model.options.length = 0;
  model.raw = { readings: [], photoIssues: [] };
  model.invoke.mockClear();
  model.withStructuredOutput.mockClear();
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PhotoExtractorService.extract', () => {
  it('throws ExtractionNotConfiguredError without ANTHROPIC_API_KEY, before any model is built', async () => {
    const service = extractor({ ...ENV, ANTHROPIC_API_KEY: undefined });
    await expect(service.extract({ image: photo, meters, inbox: false })).rejects.toBeInstanceOf(
      ExtractionNotConfiguredError,
    );
    expect(model.options).toEqual([]);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it('builds the model from env, without thinking or temperature', async () => {
    await extractor().extract({ image: photo, meters, inbox: false });
    expect(model.options).toHaveLength(1);
    const options = model.options[0] as Record<string, unknown>;
    expect(options).toMatchObject({
      model: 'claude-haiku-5-5',
      apiKey: 'sk-ant-test',
      outputConfig: { effort: 'low' },
    });
    expect(options).not.toHaveProperty('thinking');
    expect(options).not.toHaveProperty('temperature');
  });

  it("uses native structured output (method 'jsonSchema', never functionCalling)", async () => {
    await extractor().extract({ image: photo, meters, inbox: false });
    expect(model.withStructuredOutput).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'jsonSchema' }),
    );
  });

  it.each([false, true])(
    'sends the system prompt, then the image before the candidates text (inbox: %s)',
    async (inbox) => {
      await extractor().extract({ image: photo, meters, inbox });
      const [messages] = model.invoke.mock.calls[0] as [unknown[]];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toBeInstanceOf(SystemMessage);
      expect(messages[1]).toBeInstanceOf(HumanMessage);
      const content = (messages[1] as HumanMessage).content as Record<string, unknown>[];
      expect(content.map((part) => part.type)).toEqual(['image', 'text']);
      expect(content[0]).toMatchObject({ mimeType: 'image/jpeg' });
      expect(content[1]).toMatchObject({ text: describeCandidates(meters, inbox) });
    },
  );

  it("normalizes the model's answer", async () => {
    const raw: Extraction = {
      readings: [
        {
          meterId: 'not-a-candidate',
          serialNumber: '№ 02006847',
          utility: 'ELECTRICITY',
          zone: 'TOTAL',
          value: '00532,20',
          confidence: 'high',
          issues: [],
        },
      ],
      photoIssues: ['glare'],
    };
    model.raw = raw;
    const result = await extractor().extract({ image: photo, meters, inbox: false });
    expect(result).toEqual({
      readings: [
        {
          meterId: null,
          serialNumber: '02006847',
          utility: 'ELECTRICITY',
          zone: 'TOTAL',
          value: '532.20',
          confidence: 'low',
          issues: ['unknown meterId'],
        },
      ],
      photoIssues: ['glare'],
    });
  });
});
