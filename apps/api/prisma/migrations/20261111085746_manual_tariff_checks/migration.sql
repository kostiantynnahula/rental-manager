-- MANUAL tariffs (#49), after manual_tariff_kind added the enum values.

-- METERED bills the consumption of >= 1 utility; FIXED and MANUAL have none. NULL counts as an empty list.
ALTER TABLE "tariffs" DROP CONSTRAINT "tariffs_utilities_match_kind";
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_utilities_match_kind"
  CHECK (
    ("kind" = 'METERED' AND COALESCE(cardinality("utilities"), 0) >= 1)
    OR ("kind" IN ('FIXED', 'MANUAL') AND COALESCE(cardinality("utilities"), 0) = 0)
  );

-- RENT has no tariff; a MANUAL line has only an amount (no quantity, no unit price).
ALTER TABLE "statement_lines" DROP CONSTRAINT "statement_lines_tariff_by_type";
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_tariff_by_type"
  CHECK (
    ("tariffId" IS NULL) = ("type" = 'RENT')
    AND ("quantity" IS NULL) = ("type" = 'MANUAL')
    AND ("unitPrice" IS NULL) = ("type" = 'MANUAL')
  );
