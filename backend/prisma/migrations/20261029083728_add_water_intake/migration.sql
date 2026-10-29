-- CreateTable
CREATE TABLE "water_intakes" (
    "id" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "entryDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "water_intakes_entryDate_idx" ON "water_intakes"("entryDate");
