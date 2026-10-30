export interface PgErrorInfo {
  // Postgres SQLSTATE, e.g. 23505 (unique), 23P01 (exclusion), 23514 (check).
  code?: string;
  constraint?: string;
  fields?: string[];
}
