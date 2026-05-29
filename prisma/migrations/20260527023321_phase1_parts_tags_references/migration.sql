/*
  Warnings:

  - You are about to drop the `Commit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContextLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `apiSpec` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `architecture` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `dbSchema` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `diagrams` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `prd` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `promptContext` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `taskList` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `workflow` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "parts" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "references" TEXT;
ALTER TABLE "Project" ADD COLUMN "tags" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Commit";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ContextLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PlanSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanSnapshot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("createdAt", "id", "projectId", "updatedAt", "version") SELECT "createdAt", "id", "projectId", "updatedAt", "version" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_projectId_key" ON "Plan"("projectId");
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "customModels" TEXT,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("apiKey", "baseUrl", "id", "model", "provider", "temperature", "updatedAt") SELECT "apiKey", "baseUrl", "id", "model", "provider", "temperature", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
