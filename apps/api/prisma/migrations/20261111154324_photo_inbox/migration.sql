-- Inbox photos: uploaded without an apartment (apartmentId null) until one is assigned.

-- AlterTable
ALTER TABLE "photos" ALTER COLUMN "apartmentId" DROP NOT NULL;
