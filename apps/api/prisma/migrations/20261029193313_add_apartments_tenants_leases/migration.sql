-- CreateEnum
CREATE TYPE "lease_tenant_role" AS ENUM ('PRIMARY', 'CONTACT');

-- CreateTable
CREATE TABLE "apartments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "monthlyRent" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_tenants" (
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "role" "lease_tenant_role" NOT NULL,

    CONSTRAINT "lease_tenants_pkey" PRIMARY KEY ("leaseId","tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "apartments_name_key" ON "apartments"("name");

-- CreateIndex
CREATE INDEX "leases_apartmentId_idx" ON "leases"("apartmentId");

-- CreateIndex
CREATE INDEX "lease_tenants_tenantId_idx" ON "lease_tenants"("tenantId");

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_tenants" ADD CONSTRAINT "lease_tenants_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_tenants" ADD CONSTRAINT "lease_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Added by hand: constraints Prisma can't express in schema.prisma.
-- ---------------------------------------------------------------------------------------------

-- endDate is the inclusive last day; a one-day lease (endDate = startDate) is allowed.
-- NULL endDate (open-ended) passes: CHECK treats NULL as not-false.
ALTER TABLE "leases" ADD CONSTRAINT "leases_dates_check"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- No two leases of the same apartment may overlap. GiST exclusion: a new row is rejected if any
-- existing row has an equal apartmentId AND an overlapping (&&) date range. '[]' = both ends
-- inclusive, so a lease ending 2026-05-31 and the next one starting 2026-06-01 are fine, but
-- both on 2026-05-31 conflict. Open-ended lease = range up to 'infinity'.
-- btree_gist provides GiST support for "=" on uuid.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "leases" ADD CONSTRAINT "leases_no_overlap" EXCLUDE USING gist (
  "apartmentId" WITH =,
  daterange("startDate", COALESCE("endDate", 'infinity'::date), '[]') WITH &&
);

-- At most one PRIMARY tenant per lease: unique on leaseId, but only over PRIMARY rows,
-- so any number of CONTACT rows is allowed.
CREATE UNIQUE INDEX "lease_tenants_one_primary" ON "lease_tenants" ("leaseId") WHERE "role" = 'PRIMARY';
