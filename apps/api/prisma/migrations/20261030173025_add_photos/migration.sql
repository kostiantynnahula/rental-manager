-- AlterTable
ALTER TABLE "readings" ADD COLUMN     "photoId" UUID;

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "apartmentId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "originalFilename" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_storageKey_key" ON "photos"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "photos_thumbnailKey_key" ON "photos"("thumbnailKey");

-- CreateIndex
CREATE UNIQUE INDEX "photos_sha256_key" ON "photos"("sha256");

-- CreateIndex
CREATE INDEX "photos_apartmentId_createdAt_idx" ON "photos"("apartmentId", "createdAt");

-- CreateIndex
CREATE INDEX "photos_uploadedById_idx" ON "photos"("uploadedById");

-- CreateIndex
CREATE INDEX "readings_photoId_idx" ON "readings"("photoId");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Raw SQL (Prisma can't express these):
ALTER TABLE "photos" ADD CONSTRAINT "photos_size_positive" CHECK ("size" > 0);
ALTER TABLE "photos" ADD CONSTRAINT "photos_sha256_hex" CHECK ("sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "photos" ADD CONSTRAINT "photos_dimensions_positive" CHECK ("width" > 0 AND "height" > 0);
