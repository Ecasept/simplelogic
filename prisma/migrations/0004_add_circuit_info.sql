-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_circuits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "wireCount" INTEGER NOT NULL,
    "componentCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "circuits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authjs_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_circuits" ("data", "id", "name", "userId") SELECT "data", "id", "name", "userId" FROM "circuits";
DROP TABLE "circuits";
ALTER TABLE "new_circuits" RENAME TO "circuits";
CREATE UNIQUE INDEX "circuits_userId_name_key" ON "circuits"("userId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
