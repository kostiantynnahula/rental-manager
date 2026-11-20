import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';
import { prepareImage } from '../extraction/helpers/prepare-image.js';
import { chatModel } from '../llm/chat-model.js';
import { DESCRIPTION_SYSTEM_PROMPT } from './helpers/description-prompt.js';
import { descriptionSchema } from './helpers/description-schema.js';
import { normalizeDescription } from './helpers/normalize-description.js';
import type { ConditionPhotoDescription } from './interfaces/condition-photo-description.interface.js';
import type { RawDescription } from './interfaces/raw-description.interface.js';

// The prompt asks for a few sentences and a list; this leaves room for a crowded room.
const MAX_TOKENS = 4000;

// One vision call per condition photo: the photo in, a structured description (Ukrainian) out — nothing is saved
// here. Model from DESCRIPTION_MODEL, provider and key shared with extraction. Logs model, duration and counts —
// never the image or the API key.
@Injectable()
export class ConditionPhotoDescriber {
  private readonly logger = new Logger(ConditionPhotoDescriber.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async describe(image: Buffer): Promise<ConditionPhotoDescription> {
    const prepared = await prepareImage(image);
    const modelName = this.config.get('DESCRIPTION_MODEL', { infer: true });
    // Native structured output, never "functionCalling" (see worker-extraction.md).
    const model = chatModel(this.config, {
      model: modelName,
      maxTokens: MAX_TOKENS,
    }).withStructuredOutput<RawDescription>(descriptionSchema, {
      name: 'condition_photo_description',
      method: 'jsonSchema',
    });
    const started = Date.now();
    const raw = await model.invoke([
      new SystemMessage(DESCRIPTION_SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          { type: 'image', data: prepared.data, mimeType: prepared.mimeType },
          { type: 'text', text: 'Describe this photo.' },
        ],
      }),
    ]);
    const description = normalizeDescription(raw);
    this.logger.log(
      `${modelName}: ${description.room}, ${description.items.length} items in ${Date.now() - started} ms`,
    );
    return description;
  }
}
