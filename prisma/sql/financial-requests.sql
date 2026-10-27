-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "WorkflowChain" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "FinancialRequest" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "typeId" TEXT,
    "typeLabel" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL(5,2),
    "bankName" TEXT,
    "iban" TEXT,
    "accountNumber" TEXT,
    "serial" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRequestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRequest_requestId_key" ON "FinancialRequest"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRequest_serial_key" ON "FinancialRequest"("serial");

-- CreateIndex
CREATE INDEX "FinancialRequest_typeId_idx" ON "FinancialRequest"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRequestType_name_key" ON "FinancialRequestType"("name");

-- CreateIndex
CREATE INDEX "FinancialRequestType_order_idx" ON "FinancialRequestType"("order");

-- CreateIndex
CREATE INDEX "Request_kind_status_idx" ON "Request"("kind", "status");

-- CreateIndex
CREATE INDEX "WorkflowChain_purpose_isActive_idx" ON "WorkflowChain"("purpose", "isActive");

-- AddForeignKey
ALTER TABLE "FinancialRequest" ADD CONSTRAINT "FinancialRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRequest" ADD CONSTRAINT "FinancialRequest_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FinancialRequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
