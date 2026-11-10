-- reading_consumption gains "previousPeriod": the period of the previous confirmed value of the same meter and zone
-- (NULL when there is none) — the gap between readings, for the statement's consumption warnings.
-- Same view otherwise; OR REPLACE only allows new columns at the end.
CREATE OR REPLACE VIEW "reading_consumption" AS
SELECT
  r."id"          AS "readingId",
  r."meterId",
  v."zone",
  r."period",
  r."readingDate",
  r."kind",
  v."value",
  LAG(v."value") OVER w             AS "previousValue",
  v."value" - LAG(v."value") OVER w AS "consumption",
  LAG(r."period") OVER w            AS "previousPeriod"
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
