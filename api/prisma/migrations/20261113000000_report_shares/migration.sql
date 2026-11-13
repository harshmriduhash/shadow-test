CREATE TABLE "ReportShare" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportShare_token_hash_key" ON "ReportShare"("token_hash");
CREATE INDEX "ReportShare_reportId_created_at_idx" ON "ReportShare"("reportId", "created_at");
CREATE INDEX "ReportShare_expires_at_revoked_at_idx" ON "ReportShare"("expires_at", "revoked_at");

ALTER TABLE "ReportShare"
    ADD CONSTRAINT "ReportShare_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportShare"
    ADD CONSTRAINT "ReportShare_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
