// The API's marker (api-chat.md → Sources); it already strips every id a tool didn't return in that run.
const MARKER = /\[\[photo:([^\]\s]+)\]\]/g;

export const PHOTO_LINK_PREFIX = '#photo:';

// "[[photo:<id>]]" → "[фото](#photo:<id>)": a markdown link the answer's `a` renders as an inline chip, so a marker
// mid-sentence doesn't split the markdown. A hash link, so Streamdown's link hardening keeps it.
export function photoMarkersToLinks(text: string): string {
  return text.replace(
    MARKER,
    (_, id: string) => `[фото](${PHOTO_LINK_PREFIX}${encodeURIComponent(id)})`,
  );
}
