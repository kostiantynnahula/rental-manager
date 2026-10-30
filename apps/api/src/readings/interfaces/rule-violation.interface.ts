export interface RuleViolation {
  // true → 409 (state conflict), false → 400 (invalid input).
  conflict: boolean;
  message: string;
}
