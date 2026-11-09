ALTER TABLE "Project" ADD COLUMN "organization_id" TEXT;
CREATE INDEX "Project_organization_id_createdAt_idx" ON "Project"("organization_id", "createdAt");

CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectDocument_storage_key_key" ON "ProjectDocument"("storage_key");
CREATE INDEX "ProjectDocument_projectId_createdAt_idx" ON "ProjectDocument"("projectId", "createdAt");
CREATE INDEX "ProjectDocument_projectId_status_idx" ON "ProjectDocument"("projectId", "status");

ALTER TABLE "ProjectDocument"
ADD CONSTRAINT "ProjectDocument_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
