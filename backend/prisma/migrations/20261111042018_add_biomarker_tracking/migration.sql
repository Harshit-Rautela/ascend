-- CreateEnum
CREATE TYPE "BiomarkerCategory" AS ENUM ('CARDIOVASCULAR_FITNESS', 'METABOLIC', 'LIPID', 'LIVER', 'KIDNEY', 'BLOOD', 'HORMONE_NUTRITION');

-- CreateEnum
CREATE TYPE "BiomarkerDataType" AS ENUM ('NUMERIC', 'TEXT');

-- CreateEnum
CREATE TYPE "BiomarkerSource" AS ENUM ('MANUAL', 'LAB_REPORT', 'WEARABLE', 'FITNESS_TEST');

-- CreateTable
CREATE TABLE "Biomarker" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BiomarkerCategory" NOT NULL,
    "dataType" "BiomarkerDataType" NOT NULL DEFAULT 'NUMERIC',
    "defaultUnit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Biomarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomarkerResult" (
    "id" TEXT NOT NULL,
    "biomarkerId" TEXT NOT NULL,
    "valueNumeric" DECIMAL(12,4),
    "valueText" TEXT,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "referenceLow" DECIMAL(12,4),
    "referenceHigh" DECIMAL(12,4),
    "referenceRange" TEXT,
    "labFlag" TEXT,
    "source" "BiomarkerSource" NOT NULL DEFAULT 'MANUAL',
    "sourceName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiomarkerResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Biomarker_key_key" ON "Biomarker"("key");

-- CreateIndex
CREATE INDEX "Biomarker_category_idx" ON "Biomarker"("category");

-- CreateIndex
CREATE INDEX "BiomarkerResult_biomarkerId_measuredAt_idx" ON "BiomarkerResult"("biomarkerId", "measuredAt");

-- CreateIndex
CREATE INDEX "BiomarkerResult_source_measuredAt_idx" ON "BiomarkerResult"("source", "measuredAt");

-- AddForeignKey
ALTER TABLE "BiomarkerResult" ADD CONSTRAINT "BiomarkerResult_biomarkerId_fkey" FOREIGN KEY ("biomarkerId") REFERENCES "Biomarker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
