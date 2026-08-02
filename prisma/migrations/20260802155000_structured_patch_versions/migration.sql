-- AlterTable
ALTER TABLE "Snippet" ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "sourceVersion" INTEGER NOT NULL DEFAULT 0;
