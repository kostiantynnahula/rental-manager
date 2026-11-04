-- CreateEnum
CREATE TYPE "statement_status" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "statement_line_type" AS ENUM ('RENT', 'FIXED', 'METERED');

-- CreateTable
CREATE TABLE "statements" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "period" DATE NOT NULL,
    "leaseId" UUID,
    "status" "statement_status" NOT NULL DEFAULT 'ISSUED',
    "totalAmount" INTEGER NOT NULL,
    "warnings" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" UUID NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "cancelNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_lines" (
    "id" UUID NOT NULL,
    "statementId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "statement_line_type" NOT NULL,
    "tariffId" UUID,
    "name" TEXT NOT NULL,
    "utilities" "utility_type"[],
    "zone" "zone",
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "amount" INTEGER NOT NULL,
    "details" JSONB,

    CONSTRAINT "statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "statements_apartmentId_period_idx" ON "statements"("apartmentId", "period" DESC);

-- CreateIndex
CREATE INDEX "statements_leaseId_idx" ON "statements"("leaseId");

-- CreateIndex
CREATE INDEX "statements_issuedById_idx" ON "statements"("issuedById");

-- CreateIndex
CREATE INDEX "statements_cancelledById_idx" ON "statements"("cancelledById");

-- CreateIndex
CREATE INDEX "statement_lines_tariffId_idx" ON "statement_lines"("tariffId");

-- CreateIndex
CREATE UNIQUE INDEX "statement_lines_statementId_position_key" ON "statement_lines"("statementId", "position");

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Added by hand: constraints Prisma can't express in schema.prisma.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE "statements" ADD CONSTRAINT "statements_period_first_of_month"
  CHECK (EXTRACT(DAY FROM "period") = 1);

-- Cancelled ones may repeat: re-issuing = cancel + issue again. Also settles races between two issues.
CREATE UNIQUE INDEX "statements_one_issued_per_period"
  ON "statements" ("apartmentId", "period") WHERE "status" = 'ISSUED';

-- Both directions: an ISSUED statement carries no cancellation data.
ALTER TABLE "statements" ADD CONSTRAINT "statements_cancel_consistency" CHECK (
  ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL)
  OR ("status" = 'ISSUED' AND "cancelledAt" IS NULL AND "cancelledById" IS NULL)
);

ALTER TABLE "statements" ADD CONSTRAINT "statements_total_non_negative"
  CHECK ("totalAmount" >= 0);

ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_tariff_by_type"
  CHECK (("tariffId" IS NULL) = ("type" = 'RENT'));

ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_non_negative"
  CHECK ("quantity" >= 0 AND "unitPrice" >= 0 AND "amount" >= 0);
