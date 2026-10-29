-- استبانةُ قياس تنفيذ الخطة التشغيلية: جدولان، إضافيّان لا يمسّان قائماً.
--
-- و`PlanSurvey` صفٌّ لكل جمعية (`charityId` فريد) لا صفٌّ لكل إرسال: الرابطُ
-- يُنشر مرّةً فيُجيب عليه عشرةٌ، فالصفُّ هو الرابطُ وحالتُه والأجوبةُ تحته.

CREATE TABLE IF NOT EXISTS "PlanSurvey" (
  "id"        TEXT         NOT NULL,
  "charityId" TEXT         NOT NULL,
  "token"     TEXT         NOT NULL,
  "isOpen"    BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanSurvey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanSurvey_charityId_key" ON "PlanSurvey" ("charityId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlanSurvey_token_key"     ON "PlanSurvey" ("token");

CREATE TABLE IF NOT EXISTS "PlanSurveyResponse" (
  "id"               TEXT         NOT NULL,
  "surveyId"         TEXT         NOT NULL,
  "department"       TEXT         NOT NULL,
  "role"             TEXT         NOT NULL,
  "initiativeIds"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "extraInitiatives" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ratings"          JSONB        NOT NULL,
  "tasks"            JSONB        NOT NULL,
  "pace"             TEXT         NOT NULL,
  "causes"           TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "causeOther"       TEXT,
  "topCauses"        TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "blockers"         JSONB        NOT NULL,
  "outlook"          TEXT         NOT NULL,
  "achievements"     TEXT,
  "neededAction"     TEXT,
  "suggestions"      TEXT,
  "submittedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlanSurveyResponse_surveyId_submittedAt_idx"
  ON "PlanSurveyResponse" ("surveyId", "submittedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanSurvey_charityId_fkey') THEN
    ALTER TABLE "PlanSurvey"
      ADD CONSTRAINT "PlanSurvey_charityId_fkey"
      FOREIGN KEY ("charityId") REFERENCES "Charity" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanSurveyResponse_surveyId_fkey') THEN
    ALTER TABLE "PlanSurveyResponse"
      ADD CONSTRAINT "PlanSurveyResponse_surveyId_fkey"
      FOREIGN KEY ("surveyId") REFERENCES "PlanSurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
