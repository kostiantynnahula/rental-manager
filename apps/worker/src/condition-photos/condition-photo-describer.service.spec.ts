import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type { Env } from '../config/env.validation.js';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import { ConditionPhotoDescriber } from './condition-photo-describer.service.js';
import { DESCRIPTION_SYSTEM_PROMPT } from './helpers/description-prompt.js';
import type { RawDescription } from './interfaces/raw-description.interface.js';

// The model is never called: ChatAnthropic is a fake recording what the service gives it.
const model = vi.hoisted(() => {
  const state = {
    options: [] as unknown[],
    raw: undefined as unknown,
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
  EXTRACTION_MODEL: 'claude-sonnet-5-5',
  EXTRACTION_EFFORT: 'high',
  DESCRIPTION_MODEL: 'claude-haiku-5-5',
  ANTHROPIC_API_KEY: 'sk-ant-test',
};

const RAW: RawDescription = {
  room: 'BATHROOM',
  items: [{ name: 'змішувач', count: null, condition: 'іржа' }],
  summary: 'Ванна кімната.',
};

function describer(env: Record<string, string | undefined> = ENV) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService<Env, true>;
  return new ConditionPhotoDescriber(config);
}

let photo: Buffer;

beforeAll(async () => {
  photo = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#888' } })
    .png()
    .toBuffer();
});

beforeEach(() => {
  model.options.length = 0;
  model.raw = RAW;
  model.invoke.mockClear();
  model.withStructuredOutput.mockClear();
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConditionPhotoDescriber.describe', () => {
  it('throws ExtractionNotConfiguredError without ANTHROPIC_API_KEY, before any model is built', async () => {
    await expect(
      describer({ ...ENV, ANTHROPIC_API_KEY: undefined }).describe(photo),
    ).rejects.toBeInstanceOf(ExtractionNotConfiguredError);
    expect(model.options).toEqual([]);
  });

  it("uses DESCRIPTION_MODEL, not extraction's model or effort", async () => {
    await describer().describe(photo);
    expect(model.options).toHaveLength(1);
    const options = model.options[0] as Record<string, unknown>;
    expect(options).toMatchObject({ model: 'claude-haiku-5-5', apiKey: 'sk-ant-test' });
    expect(options).not.toHaveProperty('outputConfig');
    expect(options).not.toHaveProperty('thinking');
    expect(options).not.toHaveProperty('temperature');
  });

  it("uses native structured output (method 'jsonSchema', never functionCalling)", async () => {
    await describer().describe(photo);
    expect(model.withStructuredOutput).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'jsonSchema' }),
    );
  });

  it('sends the system prompt, then the image (as JPEG) before the text', async () => {
    await describer().describe(photo);
    const [messages] = model.invoke.mock.calls[0] as [unknown[]];
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(SystemMessage);
    expect((messages[0] as SystemMessage).content).toBe(DESCRIPTION_SYSTEM_PROMPT);
    const content = (messages[1] as HumanMessage).content as Record<string, unknown>[];
    expect(content.map((part) => part.type)).toEqual(['image', 'text']);
    expect(content[0]).toMatchObject({ mimeType: 'image/jpeg' });
  });

  it("normalizes the model's answer", async () => {
    await expect(describer().describe(photo)).resolves.toEqual({
      room: 'BATHROOM',
      items: [{ name: 'змішувач', condition: 'іржа' }],
      summary: 'Ванна кімната.',
    });
  });
});
