-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "exerciseType" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "movementPattern" TEXT,
ADD COLUMN     "primaryMuscle" TEXT,
ADD COLUMN     "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE INDEX "Exercise_primaryMuscle_idx" ON "Exercise"("primaryMuscle");

-- CreateIndex
CREATE INDEX "Exercise_exerciseType_idx" ON "Exercise"("exerciseType");

-- CreateIndex
CREATE INDEX "Exercise_movementPattern_idx" ON "Exercise"("movementPattern");
