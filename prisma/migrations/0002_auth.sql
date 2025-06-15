-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Graph";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "graphs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "authjs_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "authjs_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "authjs_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authjs_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "authjs_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "authjs_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authjs_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "authjs_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "graphs_name_key" ON "graphs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "authjs_users_email_key" ON "authjs_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authjs_accounts_provider_providerAccountId_key" ON "authjs_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "authjs_sessions_sessionToken_key" ON "authjs_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "authjs_verification_tokens_identifier_token_key" ON "authjs_verification_tokens"("identifier", "token");
