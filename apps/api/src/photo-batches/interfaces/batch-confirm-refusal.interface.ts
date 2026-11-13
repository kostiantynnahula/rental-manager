// A confirmable reading the confirm rules refused (e.g. a confirmed reading of the period already exists).
export interface BatchConfirmRefusal {
  readingId: string;
  reason: string;
}
