-- CreateEnum
CREATE TYPE "tariff_kind" AS ENUM ('METERED', 'FIXED');

-- CreateTable
CREATE TABLE "tariffs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "tariff_kind" NOT NULL,
    "utilities" "utility_type"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_prices" (
    "id" UUID NOT NULL,
    "tariffId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "zone" "zone" NOT NULL DEFAULT 'TOTAL',
    "price" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment_tariffs" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "tariffId" UUID NOT NULL,
    "activeFrom" DATE NOT NULL,
    "activeTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartment_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tariffs_name_key" ON "tariffs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_prices_tariffId_effectiveFrom_zone_key" ON "tariff_prices"("tariffId", "effectiveFrom", "zone");

-- CreateIndex
CREATE INDEX "apartment_tariffs_apartmentId_tariffId_idx" ON "apartment_tariffs"("apartmentId", "tariffId");

-- CreateIndex
CREATE INDEX "apartment_tariffs_tariffId_idx" ON "apartment_tariffs"("tariffId");

-- AddForeignKey
ALTER TABLE "tariff_prices" ADD CONSTRAINT "tariff_prices_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Added by hand: constraints Prisma can't express in schema.prisma.
-- ---------------------------------------------------------------------------------------------

-- METERED bills the consumption of ≥ 1 utility; FIXED has none. Prisma creates scalar lists as
-- nullable columns, so NULL counts as an empty list.
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_utilities_match_kind"
  CHECK (
    ("kind" = 'METERED' AND COALESCE(cardinality("utilities"), 0) >= 1)
    OR ("kind" = 'FIXED' AND COALESCE(cardinality("utilities"), 0) = 0)
  );

-- Prices change from the start of a month, like Reading.period.
ALTER TABLE "tariff_prices" ADD CONSTRAINT "tariff_prices_effective_first_of_month"
  CHECK (EXTRACT(DAY FROM "effectiveFrom") = 1);

ALTER TABLE "tariff_prices" ADD CONSTRAINT "tariff_prices_non_negative"
  CHECK ("price" >= 0);

-- Billing is by month: both ends are the 1st of a month, activeTo is the last billed month.
ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_active_from_first_of_month"
  CHECK (EXTRACT(DAY FROM "activeFrom") = 1);

ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_active_to_first_of_month"
  CHECK ("activeTo" IS NULL OR EXTRACT(DAY FROM "activeTo") = 1);

-- Same month allowed (billed for one month). NULL activeTo = ongoing.
ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_dates_check"
  CHECK ("activeTo" IS NULL OR "activeTo" >= "activeFrom");

-- A tariff is attached to an apartment at most once per month: same pattern as leases_no_overlap.
-- Both ends are 1st days and '[]' is inclusive, so [Jan 1, Mar 1] and [Apr 1, ...) don't overlap.
-- btree_gist is already installed by migration add_apartments_tenants_leases.
ALTER TABLE "apartment_tariffs" ADD CONSTRAINT "apartment_tariffs_no_overlap" EXCLUDE USING gist (
  "apartmentId" WITH =,
  "tariffId" WITH =,
  daterange("activeFrom", COALESCE("activeTo", 'infinity'::date), '[]') WITH &&
);
