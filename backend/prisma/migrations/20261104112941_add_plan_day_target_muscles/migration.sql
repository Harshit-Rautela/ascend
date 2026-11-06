-- AlterTable
ALTER TABLE "PlanDay" ADD COLUMN     "targetMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[];
