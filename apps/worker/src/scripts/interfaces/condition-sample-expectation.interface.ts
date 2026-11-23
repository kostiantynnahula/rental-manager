// One entry of <dir>/expected.json for describe:samples: items the description of `file` should name.
export interface ConditionSampleExpectation {
  file: string;
  // Each is looked for as a case-insensitive substring of the described item names.
  items: string[];
}
