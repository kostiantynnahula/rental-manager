-- AlterTable
ALTER TABLE "condition_photos" ADD COLUMN     "descriptionEditedAt" TIMESTAMP(3),
ADD COLUMN     "generatedDescription" JSONB;

-- Every existing description is the worker's (no human edits before #142).
UPDATE "condition_photos" SET "generatedDescription" = "description";
