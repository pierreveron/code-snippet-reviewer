-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snippetId" TEXT NOT NULL,
    "runToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Review_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "Snippet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("completedAt", "createdAt", "errorMessage", "id", "runToken", "snippetId", "status", "updatedAt")
SELECT "completedAt", "createdAt", "errorMessage", "id", lower(hex(randomblob(16))), "snippetId", "status", "updatedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_snippetId_key" ON "Review"("snippetId");
CREATE INDEX "Review_status_idx" ON "Review"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
