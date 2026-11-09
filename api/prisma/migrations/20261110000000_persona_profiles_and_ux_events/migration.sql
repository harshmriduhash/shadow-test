ALTER TABLE "Persona"
    ADD COLUMN "technical_knowledge" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "patience" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "decision_speed" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "risk_tolerance" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "attention_to_detail" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Persona"
    ADD CONSTRAINT "Persona_technical_knowledge_range" CHECK ("technical_knowledge" BETWEEN 1 AND 5),
    ADD CONSTRAINT "Persona_patience_range" CHECK ("patience" BETWEEN 1 AND 5),
    ADD CONSTRAINT "Persona_decision_speed_range" CHECK ("decision_speed" BETWEEN 1 AND 5),
    ADD CONSTRAINT "Persona_risk_tolerance_range" CHECK ("risk_tolerance" BETWEEN 1 AND 5),
    ADD CONSTRAINT "Persona_attention_to_detail_range" CHECK ("attention_to_detail" BETWEEN 1 AND 5);

CREATE TABLE "SimulationEvent" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SimulationEvent_step_number_positive" CHECK ("step_number" > 0),
    CONSTRAINT "SimulationEvent_type_valid" CHECK ("type" IN ('SUCCESS', 'FRICTION', 'CONFUSION', 'ABANDONMENT')),
    CONSTRAINT "SimulationEvent_severity_valid" CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE INDEX "SimulationEvent_simulationId_type_idx" ON "SimulationEvent"("simulationId", "type");
CREATE INDEX "SimulationEvent_simulationId_step_number_idx" ON "SimulationEvent"("simulationId", "step_number");

ALTER TABLE "SimulationEvent"
    ADD CONSTRAINT "SimulationEvent_simulationId_fkey"
    FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
