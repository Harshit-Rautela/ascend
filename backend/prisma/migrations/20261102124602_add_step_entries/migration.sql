-- CreateTable
CREATE TABLE "StepEntry" (
    "id" TEXT NOT NULL,
    "steps" INTEGER NOT NULL,
    "entryDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StepEntry_entryDate_key" ON "StepEntry"("entryDate");

-- CreateIndex
CREATE INDEX "StepEntry_entryDate_idx" ON "StepEntry"("entryDate");
