-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Collaborator_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Collaborator_tenantId_name_key" ON "Collaborator"("tenantId", "name");
CREATE INDEX "Collaborator_tenantId_active_idx" ON "Collaborator"("tenantId", "active");

-- Backfill: um colaborador por (tenant, responsável) já existente.
-- Tarefas sem responsável caem em "Sem responsável" para não perder o vínculo.
INSERT INTO "Collaborator" ("id", "tenantId", "name", "color", "active", "createdAt")
SELECT
    'clb_' || lower(hex(randomblob(8))),
    origem."tenantId",
    origem."nome",
    CASE (ROW_NUMBER() OVER (PARTITION BY origem."tenantId" ORDER BY origem."nome") - 1) % 8
        WHEN 0 THEN 'blue'
        WHEN 1 THEN 'violet'
        WHEN 2 THEN 'emerald'
        WHEN 3 THEN 'amber'
        WHEN 4 THEN 'rose'
        WHEN 5 THEN 'cyan'
        WHEN 6 THEN 'orange'
        ELSE 'lime'
    END,
    true,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        "tenantId",
        COALESCE(NULLIF("assignee", ''), 'Sem responsável') AS "nome"
    FROM "Obligation"
) AS origem;

-- RedefineTable: SQLite não altera coluna; recria e copia.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "collaboratorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customType" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Obligation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Obligation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Obligation" (
    "id", "tenantId", "companyId", "collaboratorId", "title", "type",
    "customType", "dueDate", "status", "recurrence", "recurrenceGroupId", "createdAt"
)
SELECT
    o."id",
    o."tenantId",
    o."companyId",
    c."id",
    o."title",
    CASE o."type"
        WHEN 'FOLHA' THEN 'FOLHA'
        WHEN 'DOCUMENTOS' THEN 'DOCUMENTOS'
        WHEN 'CONFERENCIA' THEN 'CONFERENCIA'
        WHEN 'DAS' THEN 'GUIAS'
        WHEN 'DCTF' THEN 'GUIAS'
        WHEN 'GFIP' THEN 'GUIAS'
        WHEN 'FGTS' THEN 'GUIAS'
        WHEN 'GUIAS' THEN 'GUIAS'
        ELSE 'OUTRO'
    END,
    CASE
        WHEN o."type" IN ('FOLHA', 'DOCUMENTOS', 'CONFERENCIA', 'DAS', 'DCTF', 'GFIP', 'FGTS', 'GUIAS')
        THEN NULL
        ELSE o."type"
    END,
    o."dueDate",
    o."status",
    CASE WHEN o."recurrenceGroupId" IS NULL THEN 'none' ELSE 'monthly' END,
    o."recurrenceGroupId",
    o."createdAt"
FROM "Obligation" o
JOIN "Collaborator" c
    ON c."tenantId" = o."tenantId"
   AND c."name" = COALESCE(NULLIF(o."assignee", ''), 'Sem responsável');

DROP TABLE "Obligation";
ALTER TABLE "new_Obligation" RENAME TO "Obligation";

CREATE INDEX "Obligation_tenantId_dueDate_idx" ON "Obligation"("tenantId", "dueDate");
CREATE INDEX "Obligation_tenantId_collaboratorId_idx" ON "Obligation"("tenantId", "collaboratorId");
CREATE INDEX "Obligation_tenantId_status_dueDate_idx" ON "Obligation"("tenantId", "status", "dueDate");

PRAGMA foreign_keys=ON;
