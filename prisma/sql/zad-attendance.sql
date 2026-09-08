
-- CreateEnum
CREATE TYPE "HolidayScope" AS ENUM ('GLOBAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "annualLeaveDays" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "remoteWorkAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shiftGroupId" TEXT;

-- CreateTable
CREATE TABLE "ZadShiftGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '16:00',
    "lateAfterMinutes" INTEGER NOT NULL DEFAULT 15,
    "earlyLeaveBeforeMinutes" INTEGER NOT NULL DEFAULT 15,
    "workDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4]::INTEGER[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZadShiftGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZadAttendanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "attendanceOpenedAt" TIMESTAMP(3),
    "allowedIpRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipEnforcement" "IpEnforcementMode" NOT NULL DEFAULT 'OFF',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZadAttendanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZadWorkSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZadWorkSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZadAttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workSiteId" TEXT,
    "workDate" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkInAccuracy" DOUBLE PRECISION,
    "checkInDistance" DOUBLE PRECISION,
    "checkOutAt" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "checkOutAccuracy" DOUBLE PRECISION,
    "checkOutDistance" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "manualAt" TIMESTAMP(3),
    "manualById" TEXT,
    "manualReason" TEXT,
    "autoClosedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZadAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZadEmployeeLeave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZadEmployeeLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "scope" "HolidayScope" NOT NULL DEFAULT 'GLOBAL',
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZadShiftGroup_name_key" ON "ZadShiftGroup"("name");

-- CreateIndex
CREATE INDEX "ZadWorkSite_isActive_idx" ON "ZadWorkSite"("isActive");

-- CreateIndex
CREATE INDEX "ZadAttendanceRecord_workDate_idx" ON "ZadAttendanceRecord"("workDate");

-- CreateIndex
CREATE INDEX "ZadAttendanceRecord_employeeId_workDate_idx" ON "ZadAttendanceRecord"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "ZadAttendanceRecord_autoClosedAt_idx" ON "ZadAttendanceRecord"("autoClosedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ZadAttendanceRecord_employeeId_workDate_key" ON "ZadAttendanceRecord"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "ZadEmployeeLeave_employeeId_startDate_idx" ON "ZadEmployeeLeave"("employeeId", "startDate");

-- CreateIndex
CREATE INDEX "Holiday_startDate_idx" ON "Holiday"("startDate");

-- CreateIndex
CREATE INDEX "Holiday_scope_startDate_idx" ON "Holiday"("scope", "startDate");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ZadShiftGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZadAttendanceRecord" ADD CONSTRAINT "ZadAttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZadAttendanceRecord" ADD CONSTRAINT "ZadAttendanceRecord_workSiteId_fkey" FOREIGN KEY ("workSiteId") REFERENCES "ZadWorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZadEmployeeLeave" ADD CONSTRAINT "ZadEmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Prisma cannot express "unique WHERE isDefault", so the invariant that keeps
-- "which group does an unassigned employee fall into?" answerable is written
-- here. Without it two rows could both claim to be the default and the answer
-- would depend on row order.
CREATE UNIQUE INDEX IF NOT EXISTS "ZadShiftGroup_one_default"
  ON "ZadShiftGroup" ("isDefault") WHERE "isDefault";
