// The model's answer as the schema allows it (descriptionSchema): unchecked strings, nulls for "not given".
// normalizeDescription() turns it into the API's ConditionPhotoDescriptionDto.
export interface RawDescription {
  room: string;
  items: { name: string; count: number | null; condition: string | null }[];
  summary: string;
}
