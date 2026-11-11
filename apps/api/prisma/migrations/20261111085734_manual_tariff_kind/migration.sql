-- MANUAL tariffs (#49): the amount is entered per statement. The CHECKs that use the new values are in
-- manual_tariff_checks: Postgres cannot use an enum value in the transaction that adds it.

-- AlterEnum
ALTER TYPE "statement_line_type" ADD VALUE 'MANUAL';

-- AlterEnum
ALTER TYPE "tariff_kind" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "statement_lines" ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL;
