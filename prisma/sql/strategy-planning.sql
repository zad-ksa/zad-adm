-- AlterTable
ALTER TABLE "Charity" ADD COLUMN     "isObjectivesVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOperationalVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "strategyStatus" TEXT,
ADD COLUMN     "strategyStatusUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StrategyStatusOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'muted',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyStatusOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyPerspective" (
    "id" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyPerspective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyObjective" (
    "id" TEXT NOT NULL,
    "perspectiveId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyIndicator" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "formula" TEXT,
    "frequency" TEXT,
    "polarity" TEXT NOT NULL DEFAULT 'UP',
    "cumulative" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT,
    "execOwner" TEXT,
    "measureOwner" TEXT,
    "baseline" DECIMAL(18,4),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorResult" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "target" DECIMAL(18,4),
    "actual" DECIMAL(18,4),
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndicatorResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalPlan" (
    "id" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weekCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objectiveId" TEXT,
    "durationText" TEXT,
    "managerName" TEXT,
    "owningDept" TEXT,
    "priority" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(18,2),
    "monthlyBudget" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeIndicator" (
    "initiativeId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,

    CONSTRAINT "InitiativeIndicator_pkey" PRIMARY KEY ("initiativeId","indicatorId")
);

-- CreateTable
CREATE TABLE "InitiativeStep" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phase" TEXT,
    "title" TEXT NOT NULL,
    "evidence" TEXT,
    "owner" TEXT,
    "cost" DECIMAL(18,2),
    "actualCost" DECIMAL(18,2),
    "planStartWeek" INTEGER,
    "planWeeks" INTEGER,
    "actualStartWeek" INTEGER,
    "actualWeeks" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "monthlyCost" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyStatusOption_name_key" ON "StrategyStatusOption"("name");

-- CreateIndex
CREATE INDEX "StrategyStatusOption_order_idx" ON "StrategyStatusOption"("order");

-- CreateIndex
CREATE INDEX "StrategyPerspective_charityId_order_idx" ON "StrategyPerspective"("charityId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyPerspective_charityId_prefix_key" ON "StrategyPerspective"("charityId", "prefix");

-- CreateIndex
CREATE INDEX "StrategyObjective_perspectiveId_order_idx" ON "StrategyObjective"("perspectiveId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyObjective_perspectiveId_code_key" ON "StrategyObjective"("perspectiveId", "code");

-- CreateIndex
CREATE INDEX "StrategyIndicator_objectiveId_order_idx" ON "StrategyIndicator"("objectiveId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyIndicator_objectiveId_code_key" ON "StrategyIndicator"("objectiveId", "code");

-- CreateIndex
CREATE INDEX "IndicatorResult_year_period_idx" ON "IndicatorResult"("year", "period");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorResult_indicatorId_year_period_key" ON "IndicatorResult"("indicatorId", "year", "period");

-- CreateIndex
CREATE INDEX "OperationalPlan_charityId_idx" ON "OperationalPlan"("charityId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalPlan_charityId_label_key" ON "OperationalPlan"("charityId", "label");

-- CreateIndex
CREATE INDEX "Initiative_planId_idx" ON "Initiative"("planId");

-- CreateIndex
CREATE INDEX "Initiative_objectiveId_idx" ON "Initiative"("objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "Initiative_planId_number_key" ON "Initiative"("planId", "number");

-- CreateIndex
CREATE INDEX "InitiativeIndicator_indicatorId_idx" ON "InitiativeIndicator"("indicatorId");

-- CreateIndex
CREATE INDEX "InitiativeStep_initiativeId_order_idx" ON "InitiativeStep"("initiativeId", "order");

-- AddForeignKey
ALTER TABLE "StrategyPerspective" ADD CONSTRAINT "StrategyPerspective_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyObjective" ADD CONSTRAINT "StrategyObjective_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "StrategyPerspective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyIndicator" ADD CONSTRAINT "StrategyIndicator_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategyObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorResult" ADD CONSTRAINT "IndicatorResult_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "StrategyIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalPlan" ADD CONSTRAINT "OperationalPlan_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OperationalPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "StrategyObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeIndicator" ADD CONSTRAINT "InitiativeIndicator_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeIndicator" ADD CONSTRAINT "InitiativeIndicator_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "StrategyIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeStep" ADD CONSTRAINT "InitiativeStep_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
