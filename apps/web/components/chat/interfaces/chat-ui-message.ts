import type { UIMessage } from 'ai';

// The API's data part (api-chat.md → Sources): the photos the answer cites, in order of first mention.
// A type, not an interface: UIMessage needs it assignable to Record<string, unknown>.
export type ChatDataParts = {
  sources: { photoIds: string[] };
};

export type ChatUIMessage = UIMessage<unknown, ChatDataParts>;
