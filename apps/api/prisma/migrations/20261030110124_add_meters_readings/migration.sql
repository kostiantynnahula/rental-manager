-- CreateEnum
CREATE TYPE "utility_type" AS ENUM ('ELECTRICITY', 'COLD_WATER', 'HOT_WATER', 'GAS');

-- CreateEnum
CREATE TYPE "zone_scheme" AS ENUM ('SINGLE', 'DAY_NIGHT');

-- CreateEnum
CREATE TYPE "zone" AS ENUM ('TOTAL', 'DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "reading_kind" AS ENUM ('REGULAR', 'INITIAL', 'FINAL');

-- CreateEnum
CREATE TYPE "reading_status" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "reading_source" AS ENUM ('MANUAL', 'PHOTO');

-- CreateTable
CREATE TABLE "meters" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "utility" "utility_type" NOT NULL,
    "zoneScheme" "zone_scheme" NOT NULL,
    "label" TEXT,
    "serialNumber" TEXT,
    "installedAt" DATE NOT NULL,
    "removedAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" UUID NOT NULL,
    "meterId" UUID NOT NULL,
    "period" DATE NOT NULL,
    "readingDate" DATE NOT NULL,
    "kind" "reading_kind" NOT NULL,
    "status" "reading_status" NOT NULL DEFAULT 'DRAFT',
    "source" "reading_source" NOT NULL,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_values" (
    "readingId" UUID NOT NULL,
    "zone" "zone" NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "reading_values_pkey" PRIMARY KEY ("readingId","zone")
);

-- CreateIndex
CREATE INDEX "meters_apartmentId_idx" ON "meters"("apartmentId");

-- CreateIndex
CREATE INDEX "readings_meterId_period_idx" ON "readings"("meterId", "period");

-- CreateIndex
CREATE INDEX "readings_createdById_idx" ON "readings"("createdById");

-- CreateIndex
CREATE INDEX "readings_confirmedById_idx" ON "readings"("confirmedById");

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_values" ADD CONSTRAINT "reading_values_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "readings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Added by hand: constraints Prisma can't express in schema.prisma.
-- ---------------------------------------------------------------------------------------------

-- A period is "the month", stored as its 1st day: a reading is never tied to an arbitrary day.
ALTER TABLE "readings" ADD CONSTRAINT "readings_period_first_of_month"
  CHECK (EXTRACT(DAY FROM "period") = 1);

-- A meter can't be removed before it was installed (same day allowed). NULL = still installed.
ALTER TABLE "meters" ADD CONSTRAINT "meters_removed_after_installed"
  CHECK ("removedAt" IS NULL OR "removedAt" >= "installedAt");

-- Meter values are never negative.
ALTER TABLE "reading_values" ADD CONSTRAINT "reading_values_non_negative"
  CHECK ("value" >= 0);

-- "Nothing is used until a human confirmed it": a CONFIRMED reading must record when and by whom.
-- CANCELLED readings may keep their confirmedAt/confirmedById as history, so only CONFIRMED is checked.
ALTER TABLE "readings" ADD CONSTRAINT "readings_confirmed_has_confirmer"
  CHECK ("status" <> 'CONFIRMED' OR ("confirmedAt" IS NOT NULL AND "confirmedById" IS NOT NULL));

-- Partial unique indexes: uniqueness only among CONFIRMED rows, so any number of DRAFT/CANCELLED
-- rows may coexist (several drafts, or a cancelled reading next to its correction).
-- At most one confirmed monthly reading per meter and period.
CREATE UNIQUE INDEX "readings_one_confirmed_regular_per_period" ON "readings" ("meterId", "period")
  WHERE "kind" = 'REGULAR' AND "status" = 'CONFIRMED';
-- At most one confirmed INITIAL (installation) and one confirmed FINAL (removal) reading per meter.
CREATE UNIQUE INDEX "readings_one_confirmed_initial" ON "readings" ("meterId")
  WHERE "kind" = 'INITIAL' AND "status" = 'CONFIRMED';
CREATE UNIQUE INDEX "readings_one_confirmed_final" ON "readings" ("meterId")
  WHERE "kind" = 'FINAL' AND "status" = 'CONFIRMED';
