-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "batchId" UUID,
ADD COLUMN     "replyTo" VARCHAR(128);

-- CreateIndex
CREATE INDEX "photos_batchId_idx" ON "photos"("batchId");

