-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditRunId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    CONSTRAINT "AuditFinding_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditRun_tenantId_createdAt_idx" ON "AuditRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditRun_companyId_idx" ON "AuditRun"("companyId");

-- CreateIndex
CREATE INDEX "AuditFinding_auditRunId_idx" ON "AuditFinding"("auditRunId");
