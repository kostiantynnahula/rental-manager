import { BadRequestException } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { formatDateOnly, parseDateOnly, todayDateOnly } from '../../common/helpers/date-only.js';
import { SEARCH_QUERY_MAX_LENGTH } from '../../condition-photos/constants/condition-photo-search.js';
import { ConditionPhotosService } from '../../condition-photos/condition-photos.service.js';
import type { SearchConditionPhotosQueryDto } from '../../condition-photos/dto/search-condition-photos-query.dto.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import { LeasesService } from '../../leases/leases.service.js';
import { CHAT_SEARCH_LIMIT } from '../constants/chat-agent.js';
import { toLeaseFact } from '../helpers/lease-fact.js';
import { groupByRoom, toPhotoFact } from '../helpers/photo-fact.js';
import type { ChatPhotoFact } from '../interfaces/chat-photo-fact.interface.js';
import type { ChatRunContext } from '../interfaces/chat-run-context.interface.js';

export interface ChatToolDeps {
  conditionPhotos: ConditionPhotosService;
  leases: LeasesService;
}

const dateOnly = z.iso.date().describe('YYYY-MM-DD');

// Read-only tools bound to the chat's apartment: the model never names an apartment.
export function buildChatTools(ctx: ChatRunContext, deps: ChatToolDeps) {
  const searchPhotos = tool(
    async ({ query, event, from, to }) =>
      run(ctx, 'search_photos', async () => {
        const hits = await deps.conditionPhotos.search(ctx.apartmentId, {
          q: query.trim(),
          limit: CHAT_SEARCH_LIMIT,
          event,
          from,
          to,
        } as SearchConditionPhotosQueryDto);
        const photos = hits.map(({ photo }) => toPhotoFact(photo));
        return { count: photos.length, output: { photos: remember(ctx, photos) } };
      }),
    {
      name: 'search_photos',
      description:
        "Semantic search over the descriptions of this apartment's condition photos (check-in, check-out, " +
        'changes). Returns up to 10 photos, most relevant first; an empty list = no photo shows it.',
      schema: z.object({
        query: z
          .string()
          .trim()
          .min(1)
          .max(SEARCH_QUERY_MAX_LENGTH)
          .describe('What to look for, in Ukrainian, e.g. "холодильник на кухні"'),
        event: z.enum(ConditionPhotoEvent).optional().describe('Only photos of this event'),
        from: dateOnly.optional().describe('Taken on or after (YYYY-MM-DD)'),
        to: dateOnly.optional().describe('Taken on or before (YYYY-MM-DD)'),
      }),
    },
  );

  const getConditionBaseline = tool(
    async ({ date }) =>
      run(ctx, 'get_condition_baseline', async () => {
        const onDate = date ? parseDateOnly(date) : todayDateOnly();
        const baseline = await deps.conditionPhotos.baseline(ctx.apartmentId, onDate);
        const photos = remember(ctx, baseline.photos.map(toPhotoFact));
        return {
          count: photos.length,
          output: {
            date: formatDateOnly(onDate),
            checkInOn: baseline.checkInOn ? formatDateOnly(baseline.checkInOn) : null,
            rooms: groupByRoom(photos),
          },
        };
      }),
    {
      name: 'get_condition_baseline',
      description:
        "The apartment's state on a date: the photos of the latest check-in on or before it plus the CHANGE " +
        'photos since, grouped by room. Use it for "what to check at check-out". checkInOn null = no check-in ' +
        'photos yet.',
      schema: z.object({
        date: dateOnly.optional().describe('The date (YYYY-MM-DD); default today'),
      }),
    },
  );

  const getLeases = tool(
    async () =>
      run(ctx, 'get_leases', async () => {
        const leases = (await deps.leases.listForApartment(ctx.apartmentId)).map(toLeaseFact);
        return { count: leases.length, output: { leases } };
      }),
    {
      name: 'get_leases',
      description:
        "The apartment's leases, newest first: start, end (null = open-ended) and the primary tenant's name.",
      schema: z.object({}),
    },
  );

  return [searchPhotos, getConditionBaseline, getLeases];
}

function remember(ctx: ChatRunContext, photos: ChatPhotoFact[]): ChatPhotoFact[] {
  for (const photo of photos) ctx.photoIds.add(photo.photoId);
  return photos;
}

// Times and counts the call for the run log. A 400 (e.g. from after to) goes back to the model to fix its call; any
// other failure (Voyage/rerank down: 502/503) ends the run, so the answer never reads "no photos" when search failed.
async function run(
  ctx: ChatRunContext,
  name: string,
  call: () => Promise<{ count: number; output: object }>,
): Promise<string> {
  const started = performance.now();
  try {
    const { count, output } = await call();
    ctx.toolCalls.push({ name, count, ms: Math.round(performance.now() - started) });
    return JSON.stringify(output);
  } catch (error) {
    ctx.toolCalls.push({ name, count: null, ms: Math.round(performance.now() - started) });
    if (error instanceof BadRequestException) return JSON.stringify({ error: error.message });
    ctx.fail(error);
    throw error;
  }
}
