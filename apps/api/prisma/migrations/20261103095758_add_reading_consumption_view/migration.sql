-- The single place where consumption is computed (reading history now, billing later).
-- One row per value of every CONFIRMED reading; `consumption` = value − the previous confirmed value of the same
-- meter and zone (NULL when there is none, e.g. a meter's INITIAL reading).
-- LAG runs over the meter's full history: filter the view from outside (by "meterId" — a PARTITION BY column, so
-- Postgres pushes that filter down), never put period filters inside it.
-- Order: period, then readingDate, then kind (INITIAL < REGULAR < FINAL — the enum is declared REGULAR, INITIAL,
-- FINAL, hence the CASE), then createdAt.
CREATE VIEW "reading_consumption" AS
SELECT
  r."id"          AS "readingId",
  r."meterId",
  v."zone",
  r."period",
  r."readingDate",
  r."kind",
  v."value",
  LAG(v."value") OVER w             AS "previousValue",
  v."value" - LAG(v."value") OVER w AS "consumption"
FROM "readings" r
JOIN "reading_values" v ON v."readingId" = r."id"
WHERE r."status" = 'CONFIRMED'
WINDOW w AS (
  PARTITION BY r."meterId", v."zone"
  ORDER BY
    r."period",
    r."readingDate",
    CASE r."kind" WHEN 'INITIAL' THEN 0 WHEN 'REGULAR' THEN 1 ELSE 2 END,
    r."createdAt"
);
