-- CreateTable
CREATE TABLE "Nutrient" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nutrient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutrientIntake" (
    "id" TEXT NOT NULL,
    "nutrientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "sourceName" TEXT,
    "nutritionEntryId" TEXT,
    "entryDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutrientIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nutrient_key_key" ON "Nutrient"("key");

-- CreateIndex
CREATE INDEX "NutrientIntake_entryDate_idx" ON "NutrientIntake"("entryDate");

-- CreateIndex
CREATE INDEX "NutrientIntake_nutrientId_entryDate_idx" ON "NutrientIntake"("nutrientId", "entryDate");

-- CreateIndex
CREATE INDEX "NutrientIntake_source_entryDate_idx" ON "NutrientIntake"("source", "entryDate");

-- CreateIndex
CREATE INDEX "NutrientIntake_nutritionEntryId_idx" ON "NutrientIntake"("nutritionEntryId");

-- AddForeignKey
ALTER TABLE "NutrientIntake" ADD CONSTRAINT "NutrientIntake_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutrientIntake" ADD CONSTRAINT "NutrientIntake_nutritionEntryId_fkey" FOREIGN KEY ("nutritionEntryId") REFERENCES "NutritionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
