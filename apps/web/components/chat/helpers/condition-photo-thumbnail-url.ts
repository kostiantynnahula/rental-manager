// The same URL the API puts into ConditionPhotoResponseDto.thumbnailUrl; the chat only has the photo's id.
export function conditionPhotoThumbnailUrl(photoId: string): string {
  return `/api/condition-photos/${encodeURIComponent(photoId)}/thumbnail`;
}
