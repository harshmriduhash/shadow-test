CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'org:member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "simulations_used" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membership_organization_id_user_id_key" ON "Membership"("organization_id", "user_id");
CREATE UNIQUE INDEX "UsageRecord_organization_id_period_start_key" ON "UsageRecord"("organization_id", "period_start");

INSERT INTO "Organization" ("id", "name", "is_personal", "created_at", "updated_at")
SELECT DISTINCT "organization_id", 'Workspace', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Project"
WHERE "organization_id" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Organization" ("id", "name", "is_personal", "stripe_customer_id", "created_at", "updated_at")
SELECT 'personal_' || "id", 'Personal workspace', true, "stripeCustomerId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("id") DO NOTHING;

UPDATE "Project"
SET "organization_id" = 'personal_' || "userId"
WHERE "organization_id" IS NULL;

INSERT INTO "Membership" ("id", "organization_id", "user_id", "role", "created_at", "updated_at")
SELECT md5('personal_' || "id" || ':' || "id"), 'personal_' || "id", "id", 'org:owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

INSERT INTO "Membership" ("id", "organization_id", "user_id", "role", "created_at", "updated_at")
SELECT DISTINCT
    md5(project."organization_id" || ':' || project."userId"),
    project."organization_id",
    project."userId",
    CASE WHEN organization."is_personal" THEN 'org:owner' ELSE 'org:member' END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Project" AS project
JOIN "Organization" AS organization ON organization."id" = project."organization_id"
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

INSERT INTO "UsageRecord" ("id", "organization_id", "period_start", "simulations_used", "created_at", "updated_at")
SELECT
    md5(project."organization_id" || ':' || date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date::text),
    project."organization_id",
    date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    COUNT(simulation."id")::integer,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Project" AS project
LEFT JOIN "Simulation" AS simulation
    ON simulation."projectId" = project."id"
    AND simulation."createdAt" >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
GROUP BY project."organization_id"
ON CONFLICT ("organization_id", "period_start") DO NOTHING;

ALTER TABLE "Subscription" ADD COLUMN "organization_id" TEXT;
UPDATE "Subscription"
SET "organization_id" = 'personal_' || "userId";
ALTER TABLE "Subscription" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;

CREATE UNIQUE INDEX "Organization_stripe_customer_id_key" ON "Organization"("stripe_customer_id");
CREATE INDEX "Organization_deleted_at_idx" ON "Organization"("deleted_at");
CREATE INDEX "Membership_user_id_idx" ON "Membership"("user_id");
CREATE INDEX "UsageRecord_organization_id_period_start_idx" ON "UsageRecord"("organization_id", "period_start");
CREATE UNIQUE INDEX "Subscription_organization_id_key" ON "Subscription"("organization_id");
DROP INDEX "Subscription_userId_key";

ALTER TABLE "Project" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "Project"
ADD CONSTRAINT "Project_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Membership"
ADD CONSTRAINT "Membership_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership"
ADD CONSTRAINT "Membership_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageRecord"
ADD CONSTRAINT "UsageRecord_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription"
DROP CONSTRAINT "Subscription_userId_fkey";
ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
