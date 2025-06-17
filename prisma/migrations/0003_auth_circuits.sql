-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "graphs";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "circuits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "circuits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authjs_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "circuits_userId_name_key" ON "circuits"("userId", "name");
