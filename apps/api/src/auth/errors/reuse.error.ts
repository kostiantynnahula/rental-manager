// Thrown inside the rotation transaction in SessionsService.rotate() to roll it back when the
// session was already rotated concurrently. A dedicated class so the .catch() can tell it apart
// from real DB errors (those must still surface as 500, not as token reuse).
export class ReuseError extends Error {}
