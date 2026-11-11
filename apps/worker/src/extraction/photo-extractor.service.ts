import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env, ExtractionProvider } from '../config/env.validation.js';
import { ExtractionNotConfiguredError } from './errors/extraction-not-configured.error.js';
import { describeCandidates } from './helpers/describe-candidates.js';
import { EXTRACTION_SYSTEM_PROMPT } from './helpers/extraction-prompt.js';
import { extractionSchema } from './helpers/extraction-schema.js';
import { normalizeExtraction } from './helpers/normalize-extraction.js';
import { prepareImage } from './helpers/prepare-image.js';
import type { ExtractionInput } from './interfaces/extraction-input.interface.js';
import type { Extraction } from './interfaces/extraction.interface.js';

// One vision call per photo: the photo + the candidate meters (the apartment's, or all active ones for an inbox photo) in, a list of proposed readings out (never saved
// here). Provider/model/effort come from env (EXTRACTION_*). Logs model, duration and counts — never the image,
// the prompt contents or the API key.
@Injectable()
export class PhotoExtractorService {
  private readonly logger = new Logger(PhotoExtractorService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async extract({ image, meters, inbox }: ExtractionInput): Promise<Extraction> {
    const prepared = await prepareImage(image);
    // Native structured output (output_config.format). Not "functionCalling": it forces tool_choice, which current
    // Claude models (Opus 5.5, Sonnet 5.5) reject with a 400.
    const model = this.chatModel().withStructuredOutput<Extraction>(
      extractionSchema(meters.map((m) => m.id)),
      {
        name: 'meter_readings',
        method: 'jsonSchema',
      },
    );
    const started = Date.now();
    const raw = await model.invoke([
      new SystemMessage(EXTRACTION_SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          // Image first, then the text about it.
          { type: 'image', data: prepared.data, mimeType: prepared.mimeType },
          { type: 'text', text: describeCandidates(meters, inbox) },
        ],
      }),
    ]);
    const result = normalizeExtraction(raw, meters);
    this.logger.log(
      `${this.config.get('EXTRACTION_MODEL', { infer: true })}: ${result.readings.length} readings, ` +
        `${result.photoIssues.length} photo issues in ${Date.now() - started} ms`,
    );
    return result;
  }

  private chatModel(): BaseChatModel {
    const provider = this.config.get('EXTRACTION_PROVIDER', { infer: true });
    switch (provider) {
      case ExtractionProvider.Anthropic: {
        const apiKey = this.config.get('ANTHROPIC_API_KEY', { infer: true });
        if (!apiKey) {
          throw new ExtractionNotConfiguredError(
            'ANTHROPIC_API_KEY is not set: photo extraction needs it',
          );
        }
        // No thinking/temperature: current models think adaptively by default; effort sets the depth.
        return new ChatAnthropic({
          model: this.config.get('EXTRACTION_MODEL', { infer: true }),
          apiKey,
          maxTokens: 16000,
          outputConfig: { effort: this.config.get('EXTRACTION_EFFORT', { infer: true }) },
        });
      }
    }
  }
}
