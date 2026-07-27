/*
  Warnings:

  - You are about to drop the column `passed` on the `AuditFinding` table. All the data in the column will be lost.
  - Added the required column `result` to the `AuditFinding` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "qualificacao" TEXT NOT NULL,
    "faixaEtaria" TEXT,
    CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditRunId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "detail" TEXT,
    CONSTRAINT "AuditFinding_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditFinding" ("auditRunId", "code", "id", "message", "severity") SELECT "auditRunId", "code", "id", "message", "severity" FROM "AuditFinding";
DROP TABLE "AuditFinding";
ALTER TABLE "new_AuditFinding" RENAME TO "AuditFinding";
CREATE INDEX "AuditFinding_auditRunId_idx" ON "AuditFinding"("auditRunId");
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "situacaoCadastral" TEXT NOT NULL DEFAULT '',
    "cnaeCodigo" TEXT NOT NULL DEFAULT '',
    "cnaeDescricao" TEXT NOT NULL DEFAULT '',
    "porte" TEXT NOT NULL DEFAULT '',
    "naturezaJuridica" TEXT,
    "dataAbertura" DATETIME,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "complemento" TEXT,
    "bairro" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("city", "cnpj", "createdAt", "email", "healthScore", "id", "name", "phone", "state", "status", "tenantId", "tradeName", "updatedAt") SELECT "city", "cnpj", "createdAt", "email", "healthScore", "id", "name", "phone", "state", "status", "tenantId", "tradeName", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");
CREATE INDEX "Company_tenantId_state_idx" ON "Company"("tenantId", "state");
CREATE INDEX "Company_tenantId_porte_idx" ON "Company"("tenantId", "porte");
CREATE INDEX "Company_tenantId_situacaoCadastral_idx" ON "Company"("tenantId", "situacaoCadastral");
CREATE INDEX "Company_tenantId_cnaeCodigo_idx" ON "Company"("tenantId", "cnaeCodigo");
CREATE UNIQUE INDEX "Company_tenantId_cnpj_key" ON "Company"("tenantId", "cnpj");
CREATE TABLE "new_Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignee" TEXT NOT NULL DEFAULT '',
    "recurrenceGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Obligation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Obligation" ("companyId", "createdAt", "dueDate", "id", "status", "tenantId", "title", "type") SELECT "companyId", "createdAt", "dueDate", "id", "status", "tenantId", "title", "type" FROM "Obligation";
DROP TABLE "Obligation";
ALTER TABLE "new_Obligation" RENAME TO "Obligation";
CREATE INDEX "Obligation_tenantId_dueDate_idx" ON "Obligation"("tenantId", "dueDate");
CREATE INDEX "Obligation_tenantId_assignee_idx" ON "Obligation"("tenantId", "assignee");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '221 83% 53%',
    "accentColor" TEXT NOT NULL DEFAULT '214 100% 97%',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Tenant" ("createdAt", "id", "name", "slug") SELECT "createdAt", "id", "name", "slug" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Partner_companyId_idx" ON "Partner"("companyId");
