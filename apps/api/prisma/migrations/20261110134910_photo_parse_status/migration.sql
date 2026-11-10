-- The worker's parse job per photo (PENDING on upload → PARSED / NOT_MATCHED / FAILED). Older photos stay null.

-- CreateEnum
CREATE TYPE "photo_parse_status" AS ENUM ('PENDING', 'PARSED', 'NOT_MATCHED', 'FAILED');

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "parseNote" TEXT,
ADD COLUMN     "parseStatus" "photo_parse_status";
