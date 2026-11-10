-- Photo and source move from the reading to each of its values (one photo shows one register).

-- AlterTable
ALTER TABLE "reading_values" ADD COLUMN     "photoId" UUID,
ADD COLUMN     "source" "reading_source" NOT NULL DEFAULT 'MANUAL';

-- Data: every value takes its reading's photo and source. A reading whose photo was deleted (after it was
-- cancelled) kept source PHOTO without a photo; its values become MANUAL to satisfy the CHECK below.
UPDATE "reading_values" v
SET "photoId" = r."photoId",
    "source"  = CASE WHEN r."photoId" IS NULL THEN 'MANUAL'::"reading_source" ELSE 'PHOTO'::"reading_source" END
FROM "readings" r
WHERE r."id" = v."readingId";

-- DropForeignKey
ALTER TABLE "readings" DROP CONSTRAINT "readings_photoId_fkey";

-- DropIndex
DROP INDEX "readings_photoId_idx";

-- AlterTable
ALTER TABLE "readings" DROP COLUMN "photoId",
DROP COLUMN "source";

-- CreateIndex
CREATE INDEX "reading_values_photoId_idx" ON "reading_values"("photoId");

-- AddForeignKey
ALTER TABLE "reading_values" ADD CONSTRAINT "reading_values_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Raw SQL (Prisma can't express these):
ALTER TABLE "reading_values" ADD CONSTRAINT "reading_values_source_matches_photo"
  CHECK (("source" = 'PHOTO') = ("photoId" IS NOT NULL));
