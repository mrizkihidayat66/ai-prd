-- AlterTable
ALTER TABLE "Project" ADD COLUMN "metadata" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "customModels" TEXT,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "temperature" REAL NOT NULL DEFAULT 0,
    "maxTokens" INTEGER NOT NULL DEFAULT 65536,
    "contextLength" INTEGER NOT NULL DEFAULT 131072,
    "topP" REAL NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("apiKey", "baseUrl", "customModels", "id", "maxTokens", "model", "provider", "temperature", "updatedAt") SELECT "apiKey", "baseUrl", "customModels", "id", coalesce("maxTokens", 65536) AS "maxTokens", "model", "provider", "temperature", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
