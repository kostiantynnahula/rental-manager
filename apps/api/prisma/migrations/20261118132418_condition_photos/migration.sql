-- CreateEnum
CREATE TYPE "condition_photo_event" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'CHANGE');

-- CreateEnum
CREATE TYPE "condition_photo_index_status" AS ENUM ('PENDING', 'DESCRIBED', 'INDEXED', 'FAILED');

-- CreateTable
CREATE TABLE "condition_photos" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "event" "condition_photo_event" NOT NULL,
    "takenOn" DATE NOT NULL,
    "note" VARCHAR(500),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "indexStatus" "condition_photo_index_status" NOT NULL DEFAULT 'PENDING',
    "description" JSONB,
    "indexNote" TEXT,

    CONSTRAINT "condition_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "condition_photos_storageKey_key" ON "condition_photos"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "condition_photos_thumbnailKey_key" ON "condition_photos"("thumbnailKey");

-- CreateIndex
CREATE UNIQUE INDEX "condition_photos_sha256_key" ON "condition_photos"("sha256");

-- CreateIndex
CREATE INDEX "condition_photos_apartmentId_takenOn_idx" ON "condition_photos"("apartmentId", "takenOn");

-- AddForeignKey
ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

