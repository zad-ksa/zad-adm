-- Guarded equivalent of the prisma migrate diff output. Re-running is a no-op.

DO $$ BEGIN
  CREATE TYPE "DesignEventKind" AS ENUM (
    'CREATED','APPROVED','REJECTED','RESUBMITTED','EDITED','RESCHEDULED',
    'QUEUE_REORDERED','EXTENDED','STARTED','DELIVERED','REVISION_REQUESTED',
    'CHARITY_APPROVED','AUTO_APPROVED','COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "DesignRequest" ADD COLUMN IF NOT EXISTS "startedAt"   TIMESTAMP(3);
ALTER TABLE "DesignRequest" ADD COLUMN IF NOT EXISTS "startedById" TEXT;

CREATE TABLE IF NOT EXISTS "DesignRequestEvent" (
  "id"        TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "kind"      "DesignEventKind" NOT NULL,
  "actorType" "AuditActorType",
  "actorId"   TEXT,
  "actorName" TEXT,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DesignRequestEvent_requestId_createdAt_idx"
  ON "DesignRequestEvent"("requestId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DesignRequest"
    ADD CONSTRAINT "DesignRequest_startedById_fkey"
    FOREIGN KEY ("startedById") REFERENCES "Employee"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DesignRequestEvent"
    ADD CONSTRAINT "DesignRequestEvent_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "DesignRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
