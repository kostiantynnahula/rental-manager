// One golden value in <dir>/expected.json: what the model should read from `file`.
export interface SampleExpectation {
  file: string;
  // Digits; a reading matches when its serial starts with it (or it's omitted).
  serialNumber?: string;
  zone: 'TOTAL' | 'DAY' | 'NIGHT';
  value: string;
}
