ALTER TABLE "Simulation"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "Simulation_projectId_idempotency_key_key"
ON "Simulation"("projectId", "idempotency_key");
